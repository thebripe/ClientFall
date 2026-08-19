import * as React from "react";
import { Card, CardEyebrow } from "@/components/ui/card";
import { isEmptyMemory, type ClientIntelligenceExtraction, type ClientMemory } from "@/lib/types";

/**
 * CSS multi-column rather than a grid: a fixed 2-col grid left a ragged
 * hole whenever an odd number of finding categories were non-empty
 * (which is most of the time). Columns balance their own height, and
 * break-inside-avoid keeps a label glued to its list.
 */
function BalancedColumns({ children }: { children: React.ReactNode }) {
  return <div className="gap-x-8 gap-y-5 sm:columns-2 [&>*]:mb-5 [&>*]:break-inside-avoid">{children}</div>;
}

function Finding({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-subtle-foreground">{label}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <span aria-hidden className="text-subtle-foreground">
              •
            </span>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-subtle-foreground">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{value}</p>
    </div>
  );
}

export function ConversationIntelligenceCard({
  summary,
  extraction,
  analyzedLabel,
  emptyState,
}: {
  summary: string | null;
  extraction: ClientIntelligenceExtraction | null;
  analyzedLabel: string | null;
  emptyState: React.ReactNode;
}) {
  return (
    <Card className="animate-fade-in-up">
      <div>
        <CardEyebrow>What Claude found</CardEyebrow>
        {extraction && (
          <p className="mt-1.5 text-xs leading-relaxed text-subtle-foreground">
            AI-generated from this client&apos;s recent conversations
            {analyzedLabel ? ` — analyzed ${analyzedLabel}` : ""}.
          </p>
        )}
      </div>

      {!extraction ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{emptyState}</p>
      ) : (
        <>
          {extraction.relevant === false && (
            <p className="rounded-lg border border-attention-border bg-attention-surface px-3 py-2 text-xs leading-relaxed text-attention">
              Flagged as possibly not a real client relationship — worth a quick look before
              trusting the analysis below.
            </p>
          )}
          {summary && <p className="text-sm leading-relaxed text-foreground">{summary}</p>}

          <BalancedColumns>
            <Finding label="Open questions" items={extraction.open_questions} />
            <Finding label="Objections" items={extraction.objections} />
            <Finding label="Buying signals" items={extraction.buying_signals} />
            <Finding label="Hesitation signals" items={extraction.hesitation_signals} />
            <Finding label="Pricing mentions" items={extraction.pricing_mentions} />
            <Finding label="Competitor mentions" items={extraction.competitor_mentions} />
          </BalancedColumns>

          {extraction.commitments.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="mb-1.5 text-xs font-medium text-subtle-foreground">Commitments</p>
              <ul className="flex flex-col gap-1.5">
                {extraction.commitments.map((c, i) => (
                  <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {c.by === "user" ? "You" : "They"} said: &ldquo;{c.text}&rdquo;
                    {c.fulfilled === false && (
                      <span className="ml-1 text-attention">— not yet fulfilled</span>
                    )}
                    {c.fulfilled === true && <span className="ml-1 text-healthy">— fulfilled</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export function AIMemoryCard({
  memory,
  updatedLabel,
  emptyState,
}: {
  memory: ClientMemory | null;
  updatedLabel: string | null;
  emptyState: React.ReactNode;
}) {
  const empty = isEmptyMemory(memory);

  return (
    <Card className="animate-fade-in-up">
      <div>
        <CardEyebrow>What Radar remembers</CardEyebrow>
        {!empty && (
          <p className="mt-1.5 text-xs leading-relaxed text-subtle-foreground">
            Builds up automatically each time this client is analyzed
            {updatedLabel ? ` — updated ${updatedLabel}` : ""}. Only facts stated in real
            conversations, never guessed.
          </p>
        )}
      </div>

      {empty ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{emptyState}</p>
      ) : (
        <BalancedColumns>
          <Fact label="Decision maker" value={memory!.decision_maker} />
          <Fact label="Budget" value={memory!.budget} />
          <Fact label="Current software" value={memory!.current_software} />
          <Fact label="Communication style" value={memory!.communication_style} />
          <Finding label="Goals" items={memory!.goals} />
          <Finding label="Pain points" items={memory!.pain_points} />
          <Finding label="Competitors mentioned" items={memory!.competitors_mentioned} />
          <Finding label="Dates & commitments" items={memory!.important_dates_or_commitments} />
          <Finding label="Other context" items={memory!.personal_notes} />
        </BalancedColumns>
      )}
    </Card>
  );
}
