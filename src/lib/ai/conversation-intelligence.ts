import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic/client";

// Structured extraction only — this module never computes a score or
// decides what matters. src/lib/scoring/attention.ts owns that; this just
// hands it (and the UI) real signal read from the actual email content.
export const ConversationIntelligenceSchema = z.object({
  relevant: z
    .boolean()
    .describe(
      "false if this doesn't actually look like a real client/business relationship (e.g. bulk/automated mail that slipped past the filter, or a purely internal/personal thread) rather than true correspondence with a client or prospect"
    ),
  summary: z
    .string()
    .describe("1-2 sentence plain-English summary of where things currently stand with this client"),
  objections: z.array(z.string()).describe("Concerns, pushback, or objections the client has raised"),
  pricing_mentions: z
    .array(z.string())
    .describe("Any mention of price, budget, cost, or payment terms — quoted or closely paraphrased, never invented"),
  buying_signals: z.array(z.string()).describe("Concrete signs of interest or intent to move forward"),
  hesitation_signals: z.array(z.string()).describe("Concrete signs of stalling, hesitation, or cooling interest"),
  competitor_mentions: z.array(z.string()).describe("Any mention of competitors or alternatives being considered"),
  open_questions: z.array(z.string()).describe("Questions that were asked and have not been answered yet"),
  commitments: z
    .array(
      z.object({
        by: z.enum(["user", "client"]).describe("Who made the commitment"),
        text: z.string().describe("What was promised, in their own words where possible"),
        fulfilled: z
          .boolean()
          .nullable()
          .describe("Whether the commitment appears to have been kept — null if the thread doesn't show either way"),
      })
    )
    .describe("Commitments either side made, and whether they were kept"),
});

export type ConversationIntelligence = z.infer<typeof ConversationIntelligenceSchema>;

// A persistent, accumulating profile — unlike the extraction above (which
// only reflects the threads in this one analysis run), memory is meant to
// carry forward: each run is asked to update it, not replace it.
export const ClientMemorySchema = z.object({
  decision_maker: z.string().nullable().describe("Who actually decides, if stated or clearly implied — null if unknown"),
  budget: z.string().nullable().describe("Any budget/pricing figure or range they've given, in their own terms"),
  current_software: z.string().nullable().describe("Tools/vendors they've mentioned currently using"),
  competitors_mentioned: z.array(z.string()).describe("Competing options they've said they're considering or using"),
  pain_points: z.array(z.string()).describe("Problems or frustrations they've described wanting solved"),
  goals: z.array(z.string()).describe("What they've said they're trying to achieve"),
  communication_style: z
    .string()
    .nullable()
    .describe("Observed preference — e.g. 'prefers short emails', 'formal tone', 'replies fastest on weekday mornings' — only from actual observed pattern, never guessed"),
  important_dates_or_commitments: z
    .array(z.string())
    .describe("Deadlines, renewal dates, or promised follow-up dates either side mentioned"),
  personal_notes: z
    .array(z.string())
    .describe(
      "Genuinely stated personal context relevant to the relationship (e.g. an upcoming vacation they mentioned, a stated preference) — only include what was actually said, never inferred or guessed. Leave empty rather than speculate."
    ),
});

export type ClientMemory = z.infer<typeof ClientMemorySchema>;

export const EMPTY_CLIENT_MEMORY: ClientMemory = {
  decision_maker: null,
  budget: null,
  current_software: null,
  competitors_mentioned: [],
  pain_points: [],
  goals: [],
  communication_style: null,
  important_dates_or_commitments: [],
  personal_notes: [],
};

const AnalysisOutputSchema = z.object({
  intelligence: ConversationIntelligenceSchema,
  memory: ClientMemorySchema.describe(
    "The client's UPDATED memory profile: the existing memory provided below, merged with anything new learned from these threads. Keep facts that are still true. Update ones that changed. Add new ones. Never drop a fact unless these threads directly contradict it. If nothing new relevant to memory appears, return the existing memory unchanged."
  ),
});

export type ThreadForAnalysis = {
  subject: string;
  messages: { direction: "inbound" | "outbound"; date: string; text: string }[];
};

const MAX_CHARS_PER_MESSAGE = 2000;

function renderThreads(threads: ThreadForAnalysis[]): string {
  return threads
    .map((thread, i) => {
      const body = thread.messages
        .map((m) => {
          const text = m.text.slice(0, MAX_CHARS_PER_MESSAGE);
          return `[${m.direction === "outbound" ? "You" : "Client"} — ${m.date}]\n${text}`;
        })
        .join("\n\n");
      return `--- Thread ${i + 1}: ${thread.subject} ---\n${body}`;
    })
    .join("\n\n");
}

export async function analyzeClientConversation(
  clientName: string,
  threads: ThreadForAnalysis[],
  existingMemory: ClientMemory = EMPTY_CLIENT_MEMORY
): Promise<{ extraction: ConversationIntelligence; memory: ClientMemory; raw: unknown } | null> {
  if (threads.length === 0) return null;

  const response = await anthropic.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    output_config: { effort: "low", format: zodOutputFormat(AnalysisOutputSchema) },
    system:
      "You analyze email correspondence between a freelancer/small business owner and one of their clients. " +
      "Extract only what is actually present in the text — never invent numbers, commitments, or signals that " +
      "aren't there. Empty arrays are a fine and expected answer when nothing of that kind appears. You also " +
      "maintain a persistent memory profile for this client across analysis runs — update it, don't replace it " +
      "wholesale, and never fabricate a fact to fill a field.",
    messages: [
      {
        role: "user",
        content:
          `Client: ${clientName}\n\n` +
          `Existing memory for this client (JSON, may be empty):\n${JSON.stringify(existingMemory)}\n\n` +
          renderThreads(threads),
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return null;
  }

  return {
    extraction: response.parsed_output.intelligence,
    memory: response.parsed_output.memory,
    raw: response,
  };
}
