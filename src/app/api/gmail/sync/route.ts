import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getThread,
  listRecentThreadIds,
  mapWithConcurrency,
  parseAddress,
  refreshGoogleAccessToken,
  type GmailThread,
} from "@/lib/google/gmail";

const SYNC_WINDOW_DAYS = 90;
const THREAD_FETCH_CONCURRENCY = 8;

type ClientAggregate = {
  domain: string;
  nameCounts: Map<string, number>;
  threads: { id: string; lastMessageAt: string; messageCount: number }[];
};

// Walks a thread's messages and returns the first external (non-own-domain)
// counterparty found — checking the sender, then falling back to
// recipients for messages the user sent.
function findCounterparty(thread: GmailThread, ownDomain: string) {
  for (const message of thread.messages ?? []) {
    const headers = message.payload?.headers ?? [];
    const from = headers.find((h) => h.name === "From")?.value;
    const fromAddr = from ? parseAddress(from) : null;
    if (fromAddr && fromAddr.domain !== ownDomain) {
      return fromAddr;
    }

    const to = headers.find((h) => h.name === "To")?.value;
    const externalTo = to
      ?.split(",")
      .map((p) => parseAddress(p.trim()))
      .find((a) => a && a.domain !== ownDomain);
    if (externalTo) return externalTo;
  }
  return null;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tokenRow?.refresh_token) {
    return NextResponse.json(
      { error: "Gmail is not connected for this account" },
      { status: 400 }
    );
  }

  let accessToken: string;
  try {
    accessToken = await refreshGoogleAccessToken(tokenRow.refresh_token);
  } catch (err) {
    return NextResponse.json(
      { error: `Could not refresh Google access token: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  const ownDomain = user.email.split("@")[1]!.toLowerCase();

  const threadIds = await listRecentThreadIds(accessToken, SYNC_WINDOW_DAYS);
  const threads = await mapWithConcurrency(
    threadIds,
    THREAD_FETCH_CONCURRENCY,
    (id) => getThread(accessToken, id)
  );

  const clientsByDomain = new Map<string, ClientAggregate>();

  for (const thread of threads) {
    const messages = thread.messages ?? [];
    if (messages.length === 0) continue;

    const counterparty = findCounterparty(thread, ownDomain);
    if (!counterparty) continue; // internal-only thread, not a client

    const lastMessage = messages[messages.length - 1];
    const lastMessageAt = new Date(Number(lastMessage.internalDate)).toISOString();

    if (!clientsByDomain.has(counterparty.domain)) {
      clientsByDomain.set(counterparty.domain, {
        domain: counterparty.domain,
        nameCounts: new Map(),
        threads: [],
      });
    }
    const agg = clientsByDomain.get(counterparty.domain)!;
    if (counterparty.name) {
      agg.nameCounts.set(
        counterparty.name,
        (agg.nameCounts.get(counterparty.name) ?? 0) + 1
      );
    }
    agg.threads.push({
      id: thread.id,
      lastMessageAt,
      messageCount: messages.length,
    });
  }

  let clientCount = 0;
  let threadCount = 0;

  for (const agg of clientsByDomain.values()) {
    const bestName =
      [...agg.nameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      agg.domain;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .upsert(
        { user_id: user.id, name: bestName, email_domain: agg.domain },
        { onConflict: "user_id,email_domain" }
      )
      .select("id")
      .single();

    if (clientError || !client) continue;
    clientCount++;

    const rows = agg.threads.map((t) => ({
      client_id: client.id,
      gmail_thread_id: t.id,
      last_message_at: t.lastMessageAt,
      message_count: t.messageCount,
    }));

    const { error: threadError } = await supabase
      .from("threads")
      .upsert(rows, { onConflict: "client_id,gmail_thread_id" });

    if (!threadError) threadCount += rows.length;
  }

  return NextResponse.json({ clients: clientCount, threads: threadCount });
}
