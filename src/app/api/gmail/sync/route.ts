import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getHeader,
  getThread,
  groupingKeyFor,
  isConsumerEmailDomain,
  isNoiseAddress,
  listRecentThreadIds,
  mapWithConcurrency,
  parseAddress,
  refreshGoogleAccessToken,
  type GmailThread,
  type ParsedAddress,
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
  groupingKey: string;
  nameCounts: Map<string, number>;
  threads: ThreadSummary[];
  messages: ClientMessageSignal[];
};

// Own/internal addresses are excluded when looking for a thread's
// counterparty. "Own" is an exact address match (so a colleague at the
// same company doesn't get miscounted as the signed-in user); "internal"
// additionally covers same-domain colleagues, but only when that domain
// is an actual company domain — a shared webmail domain like gmail.com
// can't be treated as "internal" since unrelated people share it.
function isOwnOrInternal(
  addr: ParsedAddress,
  ownEmail: string,
  ownDomain: string,
  ownDomainIsConsumer: boolean
) {
  if (addr.email === ownEmail) return true;
  return !ownDomainIsConsumer && addr.domain === ownDomain;
}

// Walks a thread's messages and returns the first external, non-noise
// counterparty found — checking the sender, then falling back to
// recipients for messages the user sent.
function findCounterparty(
  thread: GmailThread,
  ownEmail: string,
  ownDomain: string,
  ownDomainIsConsumer: boolean
) {
  const isExternal = (a: ParsedAddress) =>
    !isOwnOrInternal(a, ownEmail, ownDomain, ownDomainIsConsumer) &&
    !isNoiseAddress(a.email);

  for (const message of thread.messages ?? []) {
    const from = getHeader(message, "From");
    const fromAddr = from ? parseAddress(from) : null;
    if (fromAddr && isExternal(fromAddr)) return fromAddr;

    const to = getHeader(message, "To");
    const externalTo = to
      ?.split(",")
      .map((p) => parseAddress(p.trim()))
      .find((a): a is ParsedAddress => a !== null && isExternal(a));
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

  const ownEmail = user.email.toLowerCase();
  const ownDomain = ownEmail.split("@")[1]!;
  const ownDomainIsConsumer = isConsumerEmailDomain(ownDomain);

  const threadIds = await listRecentThreadIds(accessToken, SYNC_WINDOW_DAYS);
  const threads = await mapWithConcurrency(
    threadIds,
    THREAD_FETCH_CONCURRENCY,
    (id) => getThread(accessToken, id)
  );

  const clientsByKey = new Map<string, ClientAggregate>();

  for (const thread of threads) {
    const messages = thread.messages ?? [];
    if (messages.length === 0) continue;

    const counterparty = findCounterparty(
      thread,
      ownEmail,
      ownDomain,
      ownDomainIsConsumer
    );
    if (!counterparty) continue; // internal-only or noise, not a client

    const key = groupingKeyFor(counterparty);
    if (!clientsByKey.has(key)) {
      clientsByKey.set(key, { groupingKey: key, nameCounts: new Map(), threads: [], messages: [] });
    }
    const agg = clientsByKey.get(key)!;
    if (counterparty.name) {
      agg.nameCounts.set(
        counterparty.name,
        (agg.nameCounts.get(counterparty.name) ?? 0) + 1
      );
    }

    // Messages come back in chronological order; only the signed-in
    // user's own exact address counts as "outbound" — a colleague
    // replying doesn't count as the user having replied.
    for (const message of messages) {
      const from = getHeader(message, "From");
      const fromAddr = from ? parseAddress(from) : null;
      const direction: MessageDirection =
        fromAddr?.email === ownEmail ? "outbound" : "inbound";
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
        lastFromAddr?.email === ownEmail ? "outbound" : "inbound",
      lastMessageFrom: lastFrom,
      lastMessageSubject: getHeader(lastMessage, "Subject") ?? "(no subject)",
      lastMessageSnippet: lastMessage.snippet ?? "",
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  let clientCount = 0;
  let threadCount = 0;

  for (const agg of clientsByKey.values()) {
    const bestName =
      [...agg.nameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      agg.groupingKey;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .upsert(
        { user_id: user.id, name: bestName, email_domain: agg.groupingKey },
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
