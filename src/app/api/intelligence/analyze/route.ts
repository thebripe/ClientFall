import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  extractPlainText,
  getHeader,
  getThreadFull,
  mapWithConcurrency,
  parseAddress,
  refreshGoogleAccessToken,
} from "@/lib/google/gmail";
import {
  analyzeClientConversation,
  EMPTY_CLIENT_MEMORY,
  type ClientMemory,
  type ThreadForAnalysis,
} from "@/lib/ai/conversation-intelligence";

// Priority clients only — same "needs attention" threshold used everywhere
// else in the app. Analysis is relatively expensive (Claude Opus 5), so we
// never run it on healthy relationships.
const PRIORITY_THRESHOLD = 30;
// How many of a client's most recent threads get sent to Claude. Mirrors
// the "top ~10 highest-volume threads" cost-control guardrail from the
// original spec, kept smaller since full bodies are heavier than snippets.
const THREADS_PER_CLIENT = 5;
const ANALYSIS_CONCURRENCY = 3;

type ClientToAnalyze = {
  id: string;
  name: string;
  threadIds: string[];
  latestActivity: string;
};

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(supabase, user.id, "intelligence/analyze", {
    max: 5,
    windowMinutes: 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many analysis runs in a short window — wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tokenRow?.refresh_token) {
    return NextResponse.json({ error: "Gmail is not connected for this account" }, { status: 400 });
  }

  // Latest score per client (mirrors the dashboard's own dedupe logic).
  const { data: scoreRows } = await supabase
    .from("scores_daily")
    .select("health_score, date, client_id, clients(id, name)")
    .order("date", { ascending: false });

  const seen = new Set<string>();
  const priorityClients: { id: string; name: string }[] = [];
  for (const row of scoreRows ?? []) {
    const client = row.clients as unknown as { id: string; name: string } | null;
    if (!client || seen.has(client.id)) continue;
    seen.add(client.id);
    if (row.health_score >= PRIORITY_THRESHOLD) {
      priorityClients.push({ id: client.id, name: client.name });
    }
  }

  if (priorityClients.length === 0) {
    return NextResponse.json({ analyzed: 0, skipped: 0 });
  }

  const { data: existingIntelligence } = await supabase
    .from("client_intelligence")
    .select("client_id, analyzed_through")
    .in(
      "client_id",
      priorityClients.map((c) => c.id)
    );
  const analyzedThroughByClient = new Map(
    (existingIntelligence ?? []).map((r) => [r.client_id, r.analyzed_through as string])
  );

  const { data: existingMemoryRows } = await supabase
    .from("client_memory")
    .select("client_id, memory_json")
    .in(
      "client_id",
      priorityClients.map((c) => c.id)
    );
  const memoryByClient = new Map(
    (existingMemoryRows ?? []).map((r) => [r.client_id, r.memory_json as ClientMemory])
  );

  const { data: threadRows } = await supabase
    .from("threads")
    .select("client_id, gmail_thread_id, last_message_at")
    .in(
      "client_id",
      priorityClients.map((c) => c.id)
    )
    .order("last_message_at", { ascending: false });

  const threadsByClient = new Map<string, { gmail_thread_id: string; last_message_at: string }[]>();
  for (const t of threadRows ?? []) {
    if (!t.last_message_at) continue;
    const list = threadsByClient.get(t.client_id) ?? [];
    if (list.length < THREADS_PER_CLIENT) list.push(t);
    threadsByClient.set(t.client_id, list);
  }

  const toAnalyze: ClientToAnalyze[] = [];
  let skipped = 0;
  for (const client of priorityClients) {
    const clientThreads = threadsByClient.get(client.id) ?? [];
    if (clientThreads.length === 0) continue;

    const latestActivity = clientThreads[0].last_message_at;
    const analyzedThrough = analyzedThroughByClient.get(client.id);
    const isStale = !analyzedThrough || new Date(latestActivity) > new Date(analyzedThrough);

    if (!isStale) {
      skipped++;
      continue;
    }

    toAnalyze.push({
      id: client.id,
      name: client.name,
      threadIds: clientThreads.map((t) => t.gmail_thread_id),
      latestActivity,
    });
  }

  if (toAnalyze.length === 0) {
    return NextResponse.json({ analyzed: 0, skipped });
  }

  let accessToken: string;
  try {
    accessToken = await refreshGoogleAccessToken(tokenRow.refresh_token);
  } catch (err) {
    console.error("Google token refresh failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Could not refresh Google access — try reconnecting Gmail." },
      { status: 502 }
    );
  }

  let analyzed = 0;

  await mapWithConcurrency(toAnalyze, ANALYSIS_CONCURRENCY, async (client) => {
    try {
      const fullThreads = await mapWithConcurrency(client.threadIds, ANALYSIS_CONCURRENCY, (id) =>
        getThreadFull(accessToken, id)
      );

      const ownEmail = user.email!.toLowerCase();
      const threadsForAnalysis: ThreadForAnalysis[] = fullThreads
        .filter((t) => t.messages.length > 0)
        .map((t) => ({
          subject: getHeader(t.messages[0], "Subject") ?? "(no subject)",
          messages: t.messages.map((m) => {
            const from = getHeader(m, "From");
            const fromAddr = from ? parseAddress(from) : null;
            return {
              direction: (fromAddr?.email === ownEmail ? "outbound" : "inbound") as "inbound" | "outbound",
              date: new Date(Number(m.internalDate)).toISOString(),
              text: extractPlainText(m),
            };
          }),
        }));

      const existingMemory = memoryByClient.get(client.id) ?? EMPTY_CLIENT_MEMORY;
      const result = await analyzeClientConversation(client.name, threadsForAnalysis, existingMemory);
      if (!result) return;

      await Promise.all([
        supabase.from("client_intelligence").upsert(
          {
            client_id: client.id,
            analyzed_at: new Date().toISOString(),
            analyzed_through: client.latestActivity,
            model: "claude-opus-5",
            summary: result.extraction.summary,
            extraction_json: result.extraction,
            raw_model_output_json: JSON.parse(JSON.stringify(result.raw)),
          },
          { onConflict: "client_id" }
        ),
        supabase.from("client_memory").upsert(
          {
            client_id: client.id,
            updated_at: new Date().toISOString(),
            memory_json: result.memory,
          },
          { onConflict: "client_id" }
        ),
      ]);

      analyzed++;
    } catch (err) {
      console.error(`Conversation intelligence failed for client ${client.id}:`, (err as Error).message);
    }
  });

  return NextResponse.json({ analyzed, skipped });
}
