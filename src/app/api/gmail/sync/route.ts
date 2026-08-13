import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getHeader,
  getThread,
  isNoiseAddress,
  listRecentThreadIds,
  mapWithConcurrency,
  parseAddress,
  refreshGoogleAccessToken,
  type GmailThread,
} from "@/lib/google/gmail";
import {
  computeAttentionScore,
  deriveAttentionSignal,
  type ClientMessageSignal,
  type MessageDirection,
} from "@/lib/scoring/attention";

const SYNC_WINDOW_DAYS = 60;
const THREAD_FETCH_CONCURRENCY = 8;

type ThreadSummary = {
  id: string;
  lastMessageAt: string;
  messageCount: number;
  lastMessageDirection: MessageDirection;
  lastMessageFrom: string;
  lastMessageSubject: string;
  lastMessageSnippet: string;
};

type ClientAggregate = {
  domain: string;
  nameCounts: Map<string, number>;
  threads: ThreadSummary[];
  messages: ClientMessageSignal[];
};

// Walks a thread's messages and returns the first external (non-own-domain,
// non-noise) counterparty found — checking the sender, then falling back
// to recipients for messages the user sent.
function findCounterparty(thread: GmailThread, ownDomain: string) {
  for (const message of thread.messages ?? []) {
    const from = getHeader(message, "From");
    const fromAddr = from ? parseAddress(from) : null;
    if (fromAddr && fromAddr.domain !== ownDomain && !isNoiseAddress(fromAddr.email)) {
      return fromAddr;
    }

    const to = getHeader(message, "To");
    const externalTo = to
      ?.split(",")
      .map((p) => parseAddress(p.trim()))
      .find((a) => a && a.domain !== ownDomain && !isNoiseAddress(a.email));
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
    if (!counterparty) continue; // internal-only or noise, not a client

    if (!clientsByDomain.has(counterparty.domain)) {
      clientsByDomain.set(counterparty.domain, {
        domain: counterparty.domain,
        nameCounts: new Map(),
        threads: [],
        messages: [],
      });
    }
    const agg = clientsByDomain.get(counterparty.domain)!;
    if (counterparty.name) {
      agg.nameCounts.set(
        counterparty.name,
        (agg.nameCounts.get(counterparty.name) ?? 0) + 1
      );
    }

    // Messages come back in chronological order; direction is derived by
    // comparing the sender's domain against the signed-in user's own.
    for (const message of messages) {
      const from = getHeader(message, "From");
      const fromAddr = from ? parseAddress(from) : null;
      const direction: MessageDirection =
        fromAddr?.domain === ownDomain ? "outbound" : "inbound";
      agg.messages.push({
        direction,
        dateMs: Number(message.internalDate),
      });
    }

    const lastMessage = messages[messages.length - 1];
    const lastFrom = getHeader(lastMessage, "From") ?? "";
    const lastFromAddr = parseAddress(lastFrom);
    agg.threads.push({
      id: thread.id,
      lastMessageAt: new Date(Number(lastMessage.internalDate)).toISOString(),
      messageCount: messages.length,
      lastMessageDirection:
        lastFromAddr?.domain === ownDomain ? "outbound" : "inbound",
      lastMessageFrom: lastFrom,
      lastMessageSubject: getHeader(lastMessage, "Subject") ?? "(no subject)",
      lastMessageSnippet: lastMessage.snippet ?? "",
    });
  }

  const today = new Date().toISOString().slice(0, 10);
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

    const threadRows = agg.threads.map((t) => ({
      client_id: client.id,
      gmail_thread_id: t.id,
      last_message_at: t.lastMessageAt,
      message_count: t.messageCount,
      last_message_direction: t.lastMessageDirection,
      last_message_from: t.lastMessageFrom,
      last_message_subject: t.lastMessageSubject,
      last_message_snippet: t.lastMessageSnippet,
    }));

    const { error: threadError } = await supabase
      .from("threads")
      .upsert(threadRows, { onConflict: "client_id,gmail_thread_id" });

    if (!threadError) threadCount += threadRows.length;

    const signal = deriveAttentionSignal(agg.messages);
    const { score, reasons } = computeAttentionScore(signal);

    await supabase.from("scores_daily").upsert(
      {
        client_id: client.id,
        date: today,
        health_score: score,
        top_reasons_json: reasons,
      },
      { onConflict: "client_id,date" }
    );
  }

  return NextResponse.json({ clients: clientCount, threads: threadCount });
}
