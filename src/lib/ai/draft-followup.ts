import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic/client";
import type { ClientIntelligenceExtraction } from "@/lib/types";

export const FollowUpDraftSchema = z.object({
  canDraft: z
    .boolean()
    .describe(
      "false if there isn't enough concrete, specific context (a real open question, objection, or prior commitment) to write something genuinely specific — in that case do not write generic filler"
    ),
  reason: z
    .string()
    .describe(
      "If canDraft is false, explain briefly why there isn't enough to go on. If true, a short note on what the draft references (e.g. 'references their question about timeline')."
    ),
  subject: z.string().describe("A suggested subject line. Empty string if canDraft is false."),
  draft: z
    .string()
    .describe(
      "The follow-up email body. Must reference at least one concrete specific from the conversation " +
        "(an open question, a stated objection, a prior commitment). Never generic 'just checking in' filler. " +
        "Empty string if canDraft is false."
    ),
});

export type FollowUpDraft = z.infer<typeof FollowUpDraftSchema>;

export async function draftFollowUp(input: {
  clientName: string;
  urgencyReason: string;
  suggestedAction: string;
  extraction: ClientIntelligenceExtraction | null;
  lastThreadSubject: string;
  lastThreadText: string;
}): Promise<FollowUpDraft | null> {
  const context = input.extraction
    ? [
        `Summary: ${input.extraction.summary}`,
        input.extraction.open_questions.length
          ? `Open questions from them: ${input.extraction.open_questions.join("; ")}`
          : "",
        input.extraction.objections.length
          ? `Objections they've raised: ${input.extraction.objections.join("; ")}`
          : "",
        input.extraction.commitments.length
          ? `Commitments made: ${input.extraction.commitments
              .map((c) => `${c.by === "user" ? "You" : "They"} said: "${c.text}"${c.fulfilled === false ? " (not yet fulfilled)" : ""}`)
              .join("; ")}`
          : "",
        input.extraction.hesitation_signals.length
          ? `Hesitation signals: ${input.extraction.hesitation_signals.join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "No prior conversation analysis available.";

  const response = await anthropic.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    output_config: { effort: "medium", format: zodOutputFormat(FollowUpDraftSchema) },
    system:
      "You draft follow-up emails for a freelancer/small business owner to send to a client. " +
      "Write in a professional, concise, human voice — not corporate, not overly casual. " +
      "The draft must reference at least one real, specific detail from the conversation below " +
      "(an open question, an objection, a prior commitment). Never write generic 'just checking in' " +
      "or 'wanted to follow up' filler with no substance. If the context genuinely doesn't support " +
      "anything specific, say so honestly via canDraft=false rather than inventing something. " +
      "You are drafting text only — never claim the email has been sent, and never imply this will " +
      "be sent automatically.",
    messages: [
      {
        role: "user",
        content:
          `Client: ${input.clientName}\n` +
          `Why this needs a reply: ${input.urgencyReason}\n` +
          `Suggested action: ${input.suggestedAction}\n\n` +
          `${context}\n\n` +
          `Most recent thread ("${input.lastThreadSubject}"):\n${input.lastThreadText.slice(0, 4000)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return null;
  }

  return response.parsed_output;
}
