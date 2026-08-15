import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { answerChatQuery, type ChatClientContext, type ChatTurn } from "@/lib/ai/chat";
import { firstIntelligence, type ClientIntelligenceRow, type ClientMemory, type TopReasons } from "@/lib/types";

const RequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(20)
    .optional(),
});

// Enough for any solo user's real client list without the context blob
// growing unbounded; ranked by attention score so the most relevant
// relationships never get cut off first.
const MAX_CLIENTS_IN_CONTEXT = 80;

export async function POST(request: Request) {
  const parsedBody = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }
  const { message, history } = parsedBody.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(supabase, user.id, "chat", { max: 20, windowMinutes: 60 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many messages in a short window — wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const { data: scoreRows } = await supabase
    .from("scores_daily")
    .select(
      "health_score, top_reasons_json, date, clients(id, name, threads(last_message_at), client_intelligence(analyzed_at, analyzed_through, summary, extraction_json), client_memory(updated_at, memory_json))"
    )
    .order("date", { ascending: false });

  type Row = {
    health_score: number;
    top_reasons_json: TopReasons | null;
    clients: {
      id: string;
      name: string;
      threads: { last_message_at: string | null }[];
      client_intelligence: ClientIntelligenceRow[] | ClientIntelligenceRow | null;
      client_memory: { updated_at: string; memory_json: ClientMemory }[] | { updated_at: string; memory_json: ClientMemory } | null;
    } | null;
  };

  const seen = new Set<string>();
  const clients: ChatClientContext[] = [];
  for (const row of (scoreRows as unknown as Row[] | null) ?? []) {
    const client = row.clients;
    if (!client || seen.has(client.id)) continue;
    seen.add(client.id);

    const latestActivity = client.threads
      .map((t) => t.last_message_at)
      .filter((d): d is string => Boolean(d))
      .sort()
      .pop();
    const lastContactDaysAgo = latestActivity
      ? Math.max(0, Math.floor((Date.now() - new Date(latestActivity).getTime()) / 86_400_000))
      : null;

    const intelligence = firstIntelligence(client.client_intelligence);
    const memoryRow = Array.isArray(client.client_memory) ? client.client_memory[0] : client.client_memory;

    clients.push({
      id: client.id,
      name: client.name,
      healthScore: row.health_score,
      suggestedAction: row.top_reasons_json?.suggestedAction ?? null,
      reasons: row.top_reasons_json?.reasons ?? [],
      lastContactDaysAgo,
      intelligenceSummary: intelligence?.summary ?? null,
      extraction: intelligence?.extraction_json ?? null,
      memory: memoryRow?.memory_json ?? null,
    });

    if (clients.length >= MAX_CLIENTS_IN_CONTEXT) break;
  }

  const historyTurns: ChatTurn[] = history ?? [];

  const result = await answerChatQuery(message, historyTurns, clients);
  if (!result) {
    return NextResponse.json({ error: "Claude declined to answer that." }, { status: 502 });
  }

  const referencedClients = result.referencedClientIds
    .map((id) => clients.find((c) => c.id === id))
    .filter((c): c is ChatClientContext => Boolean(c))
    .map((c) => ({ id: c.id, name: c.name }));

  return NextResponse.json({ answer: result.answer, referencedClients });
}
