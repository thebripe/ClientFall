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
  threads: ThreadForAnalysis[]
): Promise<{ extraction: ConversationIntelligence; raw: unknown } | null> {
  if (threads.length === 0) return null;

  const response = await anthropic.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    output_config: { effort: "low", format: zodOutputFormat(ConversationIntelligenceSchema) },
    system:
      "You analyze email correspondence between a freelancer/small business owner and one of their clients. " +
      "Extract only what is actually present in the text — never invent numbers, commitments, or signals that " +
      "aren't there. Empty arrays are a fine and expected answer when nothing of that kind appears.",
    messages: [
      {
        role: "user",
        content: `Client: ${clientName}\n\n${renderThreads(threads)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return null;
  }

  return { extraction: response.parsed_output, raw: response };
}
