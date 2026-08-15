import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic/client";
import { isEmptyMemory, type ClientIntelligenceExtraction, type ClientMemory } from "@/lib/types";

export const ChatResponseSchema = z.object({
  answer: z
    .string()
    .describe(
      "A direct, specific answer using only the client data provided below. If nothing in the data answers the question, say so plainly instead of guessing."
    ),
  referencedClientIds: z
    .array(z.string())
    .describe("IDs (from the client list provided) of clients this answer actually references — empty if none."),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export type ChatClientContext = {
  id: string;
  name: string;
  healthScore: number;
  suggestedAction: string | null;
  reasons: string[];
  lastContactDaysAgo: number | null;
  intelligenceSummary: string | null;
  extraction: ClientIntelligenceExtraction | null;
  memory: ClientMemory | null;
};

const MAX_LIST_ITEMS = 3;

function truncate(items: string[]): string {
  if (items.length === 0) return "";
  return items.slice(0, MAX_LIST_ITEMS).join("; ");
}

function renderClient(c: ChatClientContext): string {
  const lines = [
    `- id: ${c.id}`,
    `  name: ${c.name}`,
    `  attention score: ${c.healthScore}/100`,
    c.lastContactDaysAgo !== null ? `  last contact: ${c.lastContactDaysAgo} day(s) ago` : "",
    c.suggestedAction ? `  suggested action: ${c.suggestedAction}` : "",
    c.reasons.length ? `  reasons: ${truncate(c.reasons)}` : "",
    c.intelligenceSummary ? `  summary: ${c.intelligenceSummary}` : "",
  ];

  if (c.extraction) {
    const e = c.extraction;
    if (e.open_questions.length) lines.push(`  open questions: ${truncate(e.open_questions)}`);
    if (e.objections.length) lines.push(`  objections: ${truncate(e.objections)}`);
    if (e.pricing_mentions.length) lines.push(`  pricing mentions: ${truncate(e.pricing_mentions)}`);
    if (e.buying_signals.length) lines.push(`  buying signals: ${truncate(e.buying_signals)}`);
    if (e.competitor_mentions.length) lines.push(`  competitor mentions: ${truncate(e.competitor_mentions)}`);
  }

  if (c.memory && !isEmptyMemory(c.memory)) {
    const m = c.memory;
    if (m.decision_maker) lines.push(`  decision maker: ${m.decision_maker}`);
    if (m.budget) lines.push(`  budget: ${m.budget}`);
    if (m.goals.length) lines.push(`  goals: ${truncate(m.goals)}`);
    if (m.pain_points.length) lines.push(`  pain points: ${truncate(m.pain_points)}`);
    if (m.competitors_mentioned.length) lines.push(`  competitors: ${truncate(m.competitors_mentioned)}`);
  }

  return lines.filter(Boolean).join("\n");
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function answerChatQuery(
  message: string,
  history: ChatTurn[],
  clients: ChatClientContext[]
): Promise<ChatResponse | null> {
  const contextBlock = clients.length
    ? clients.map(renderClient).join("\n\n")
    : "No client data on file yet.";

  const response = await anthropic.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    output_config: { effort: "medium", format: zodOutputFormat(ChatResponseSchema) },
    system:
      "You are answering questions about a freelancer/small business owner's client relationships, using " +
      "only the client data provided in this message — never invent facts, numbers, or client names that " +
      "aren't in the data. If the data doesn't support an answer, say so directly rather than guessing. " +
      "Reference specific clients by name in your answer when relevant, and list their ids in " +
      "referencedClientIds so the UI can link to them.\n\nClient data:\n" +
      contextBlock,
    messages: [...history, { role: "user", content: message }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return null;
  }

  const validIds = new Set(clients.map((c) => c.id));
  return {
    ...response.parsed_output,
    referencedClientIds: response.parsed_output.referencedClientIds.filter((id) => validIds.has(id)),
  };
}
