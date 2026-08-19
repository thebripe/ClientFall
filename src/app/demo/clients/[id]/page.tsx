import Link from "next/link";
import { notFound } from "next/navigation";
import { getDemoFixture } from "@/lib/demo-data";
import { DraftFollowUp, type DraftResult } from "@/components/draft-followup";
import { DemoNotice, PageHeader, PageShell } from "@/components/page-shell";
import {
  AIMemoryCard,
  ConversationIntelligenceCard,
} from "@/components/intelligence-sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import { RISK_META, formatMoney, relativeDays, riskTier } from "@/lib/ui/risk";

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

  // Normalize the fixture into the shape the shared component expects.
  const draftResult: DraftResult = !analyzedYet
    ? { canDraft: false, reason: "Not analyzed yet in this demo.", subject: "", draft: "" }
    : draft.canDraft
      ? {
          canDraft: true,
          reason: draft.reason,
          subject: draft.subject,
          draft: draft.draft,
          recipientEmail: draft.recipientEmail,
        }
      : { canDraft: false, reason: draft.reason, subject: "", draft: "" };

  return (
    <PageShell>
      <PageHeader backHref="/demo" backLabel="Demo dashboard">
        <Button asChild variant="outline">
          <Link href="/">Connect Gmail</Link>
        </Button>
      </PageHeader>

      <DemoNotice>Sample data — this client isn&apos;t real.</DemoNotice>

      <section className="animate-fade-in-up surface-glow relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-background p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{client.name}</h1>
            <p className="mt-0.5 text-sm text-subtle-foreground">{client.email_domain}</p>
          </div>
          <Badge variant={meta.badge}>{meta.label}</Badge>
        </div>

        <div className="mt-7 flex flex-wrap gap-x-12 gap-y-5">
          <div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {row.health_score}
            </p>
            <p className="mt-1 text-xs text-subtle-foreground">attention score</p>
          </div>
          {row.dollar_at_risk ? (
            <div>
              <p className={`text-3xl font-semibold tabular-nums tracking-tight ${meta.text}`}>
                {formatMoney(row.dollar_at_risk)}
              </p>
              <p className="mt-1 text-xs text-subtle-foreground">at risk</p>
            </div>
          ) : null}
          <div>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {relativeDays(lastContactAt)}
            </p>
            <p className="mt-1 text-xs text-subtle-foreground">last contact</p>
          </div>
        </div>

        {client.contract_value ? (
          <p className="mt-7 border-t border-border pt-5 text-xs text-subtle-foreground">
            {formatMoney(client.contract_value)} contract value
          </p>
        ) : null}
      </section>

      <Card className="animate-fade-in-up relative overflow-hidden">
        <span aria-hidden className={`absolute inset-y-0 left-0 w-[2px] ${meta.dot}`} />
        <div className="flex flex-wrap items-start justify-between gap-3">
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

        <p className={`text-base font-medium leading-relaxed ${meta.text}`}>
          {row.top_reasons_json?.suggestedAction}
        </p>

        {row.top_reasons_json?.reasons?.length ? (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium text-subtle-foreground">Why</p>
            <ul className="flex flex-col gap-2">
              {row.top_reasons_json.reasons.map((reason) => (
                <li
                  key={reason}
                  className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                >
                  <span aria-hidden className={`mt-1.5 size-1 shrink-0 rounded-full ${meta.dot}`} />
                  <span className="min-w-0">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <DraftFollowUp mode="demo" draft={draftResult} />

      <ConversationIntelligenceCard
        summary={intelligence?.summary ?? null}
        extraction={extraction}
        analyzedLabel={null}
        emptyState={
          <>
            Not analyzed yet — click{" "}
            <strong className="font-medium text-foreground">Analyze conversations</strong> on the{" "}
            <Link href="/demo" className="underline underline-offset-4">
              demo dashboard
            </Link>{" "}
            to have Claude read this relationship&apos;s recent emails for objections, buying
            signals, and open questions.
          </>
        }
      />

      <AIMemoryCard
        memory={memory}
        updatedLabel={memoryUpdatedAt ? relativeDays(memoryUpdatedAt) : null}
        emptyState="Nothing remembered yet — analysis builds this up automatically from real conversations (decision maker, budget, preferences, goals)."
      />

      <p className="text-xs text-subtle-foreground">Contact on file: {contactEmail}</p>
    </PageShell>
  );
}
