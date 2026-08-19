import Link from "next/link";
import { notFound } from "next/navigation";
import { getDemoFixture } from "@/lib/demo-data";
import { DemoDraftFollowUp } from "@/components/demo-draft-followup";
import { DemoNotice, PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import { RISK_META, formatMoney, relativeDays, riskTier } from "@/lib/ui/risk";
import { isEmptyMemory } from "@/lib/types";

function IntelligenceList({ label, items }: { label: string; items?: string[] }) {
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

function MemoryFact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-subtle-foreground">{label}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{value}</p>
    </div>
  );
}

export default async function DemoClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fixture = getDemoFixture(id);
  if (!fixture) notFound();

  const { row, contactEmail, draft, analyzedYet, memory, memoryUpdatedAt } = fixture;
  const client = row.clients!;
  const tier = riskTier(row.health_score);
  const meta = RISK_META[tier];
  const lastContactAt = client.threads[0]?.last_message_at ?? null;
  const intelligence = Array.isArray(client.client_intelligence)
    ? client.client_intelligence[0]
    : client.client_intelligence;
  const extraction = intelligence?.extraction_json ?? null;

  return (
    <PageShell>
      <PageHeader backHref="/demo" backLabel="Demo dashboard">
        <Button asChild variant="outline">
          <Link href="/">Connect Gmail</Link>
        </Button>
      </PageHeader>

      <DemoNotice>Sample data — this client isn&apos;t real.</DemoNotice>

      <section className="animate-fade-in-up surface-glow relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-background p-6 shadow-[0_1px_2px_rgba(0,0,0,0.4),0_24px_48px_-24px_rgba(0,0,0,0.9)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {client.name}
            </h1>
            <p className="mt-0.5 text-sm text-subtle-foreground">{client.email_domain}</p>
          </div>
          <Badge variant={meta.badge}>{meta.label}</Badge>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {row.health_score}
            </p>
            <p className="mt-0.5 text-xs text-subtle-foreground">attention score</p>
          </div>
          {row.dollar_at_risk ? (
            <div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-urgent">
                {formatMoney(row.dollar_at_risk)}
              </p>
              <p className="mt-0.5 text-xs text-subtle-foreground">at risk</p>
            </div>
          ) : null}
          <div>
            <p className="text-sm text-muted-foreground">{relativeDays(lastContactAt)}</p>
            <p className="mt-0.5 text-xs text-subtle-foreground">last contact</p>
          </div>
        </div>
      </section>

      <Card className="animate-fade-in-up relative overflow-hidden">
        {/* Same urgency spine motif as the dashboard cards. */}
        <span aria-hidden className={`absolute inset-y-0 left-0 w-0.5 ${meta.dot}`} />
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardEyebrow>Suggested next action</CardEyebrow>
            <p className="mt-1 text-xs text-subtle-foreground">
              Calculated from reply timing, volume, and thread activity — not AI.
            </p>
          </div>
          {row.top_reasons_json?.confidence && (
            <Badge variant="outline">{row.top_reasons_json.confidence} confidence</Badge>
          )}
        </div>
        <p className={`text-sm font-medium leading-relaxed ${meta.text}`}>
          {row.top_reasons_json?.suggestedAction}
        </p>
        {row.top_reasons_json?.reasons?.length ? (
          <div className="border-t border-border pt-3">
            <p className="mb-1.5 text-xs font-medium text-subtle-foreground">Why</p>
            <ul className="flex flex-col gap-1">
              {row.top_reasons_json.reasons.map((reason) => (
                <li key={reason} className="text-xs leading-relaxed text-subtle-foreground">
                  • {reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <Card className="animate-fade-in-up">
        <div>
          <CardEyebrow>Conversation intelligence</CardEyebrow>
          {extraction && (
            <p className="mt-1.5 text-xs leading-relaxed text-subtle-foreground">
              AI-generated by Claude, based on this client&apos;s recent conversations.
            </p>
          )}
        </div>

        {!extraction ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Not analyzed yet — click{" "}
            <strong className="font-medium text-foreground">Analyze conversations</strong> on the{" "}
            <Link href="/demo" className="underline underline-offset-4">
              demo dashboard
            </Link>{" "}
            to have Claude read this relationship&apos;s recent emails for objections, buying
            signals, and open questions.
          </p>
        ) : (
          <>
            {intelligence?.summary && (
              <p className="text-sm leading-relaxed text-foreground">{intelligence.summary}</p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IntelligenceList label="Open questions" items={extraction.open_questions} />
              <IntelligenceList label="Objections" items={extraction.objections} />
              <IntelligenceList label="Buying signals" items={extraction.buying_signals} />
              <IntelligenceList label="Hesitation signals" items={extraction.hesitation_signals} />
              <IntelligenceList label="Pricing mentions" items={extraction.pricing_mentions} />
              <IntelligenceList
                label="Competitor mentions"
                items={extraction.competitor_mentions}
              />
            </div>
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
                      {c.fulfilled === true && (
                        <span className="ml-1 text-healthy">— fulfilled</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="animate-fade-in-up">
        <div>
          <CardEyebrow>AI Memory</CardEyebrow>
          {!isEmptyMemory(memory) && (
            <p className="mt-1.5 text-xs leading-relaxed text-subtle-foreground">
              Builds up automatically each time this client is analyzed
              {memoryUpdatedAt ? ` — updated ${relativeDays(memoryUpdatedAt)}` : ""}. Only facts
              stated in real conversations, never guessed.
            </p>
          )}
        </div>

        {isEmptyMemory(memory) ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nothing remembered yet — analysis builds this up automatically from real conversations
            (decision maker, budget, preferences, goals).
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MemoryFact label="Decision maker" value={memory!.decision_maker} />
              <MemoryFact label="Budget" value={memory!.budget} />
              <MemoryFact label="Current software" value={memory!.current_software} />
              <MemoryFact label="Communication style" value={memory!.communication_style} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IntelligenceList label="Goals" items={memory!.goals} />
              <IntelligenceList label="Pain points" items={memory!.pain_points} />
              <IntelligenceList
                label="Competitors mentioned"
                items={memory!.competitors_mentioned}
              />
              <IntelligenceList
                label="Dates & commitments"
                items={memory!.important_dates_or_commitments}
              />
            </div>
            <IntelligenceList label="Other context" items={memory!.personal_notes} />
          </>
        )}
      </Card>

      <DemoDraftFollowUp
        draft={analyzedYet ? draft : { canDraft: false, reason: "Not analyzed yet in this demo." }}
      />

      <p className="text-xs text-subtle-foreground">Contact on file: {contactEmail}</p>
    </PageShell>
  );
}
