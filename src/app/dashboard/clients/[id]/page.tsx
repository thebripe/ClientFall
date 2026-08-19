import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContractValueInput } from "@/components/contract-value-input";
import { DraftFollowUp } from "@/components/draft-followup";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow } from "@/components/ui/card";
import { RISK_META, formatMoney, relativeDays, riskTier } from "@/lib/ui/risk";
import { relativeTime } from "@/lib/ui/time";
import { parseAddress } from "@/lib/google/gmail";
import {
  isEmptyMemory,
  type ClientIntelligenceExtraction,
  type ClientMemory,
  type TopReasons,
} from "@/lib/types";

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

type ThreadRow = {
  gmail_thread_id: string;
  last_message_at: string | null;
  last_message_direction: "inbound" | "outbound" | null;
  last_message_subject: string | null;
  last_message_snippet: string | null;
  last_message_from: string | null;
};

const MOMENTUM_META = {
  up: { label: "Picking up", icon: "↑", text: "text-healthy" },
  down: { label: "Slowing down", icon: "↓", text: "text-attention" },
  steady: { label: "Steady", icon: "→", text: "text-muted-foreground" },
} as const;

const TREND_META = {
  warming: { label: "Replying faster", icon: "↑", text: "text-healthy" },
  cooling: { label: "Replying slower", icon: "↓", text: "text-attention" },
  steady: { label: "Steady", icon: "→", text: "text-muted-foreground" },
  unknown: { label: "Not enough history yet", icon: "·", text: "text-subtle-foreground" },
} as const;

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email_domain, contract_value")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const { data: score } = await supabase
    .from("scores_daily")
    .select("health_score, dollar_at_risk, top_reasons_json, date")
    .eq("client_id", id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: threads } = await supabase
    .from("threads")
    .select(
      "gmail_thread_id, last_message_at, last_message_direction, last_message_subject, last_message_snippet, last_message_from"
    )
    .eq("client_id", id)
    .order("last_message_at", { ascending: true });

  const { data: intelligence } = await supabase
    .from("client_intelligence")
    .select("analyzed_at, summary, extraction_json")
    .eq("client_id", id)
    .maybeSingle();

  const { data: memoryRow } = await supabase
    .from("client_memory")
    .select("updated_at, memory_json")
    .eq("client_id", id)
    .maybeSingle();

  const topReasons = score?.top_reasons_json as TopReasons | null;
  const healthScore = score?.health_score ?? 0;
  const tier = riskTier(healthScore);
  const meta = RISK_META[tier];
  const momentum = topReasons?.momentum ? MOMENTUM_META[topReasons.momentum] : null;
  const trend = TREND_META[topReasons?.trend ?? "unknown"];
  const allThreads = (threads as ThreadRow[] | null) ?? [];
  const timelineItems = allThreads.slice(-8);
  const extraction = (intelligence?.extraction_json as ClientIntelligenceExtraction | null) ?? null;
  const memory = (memoryRow?.memory_json as ClientMemory | null) ?? null;

  // Best-effort recipient for the "Open in email" link: the sender of the
  // most recent inbound message, since that's the client's own address.
  const lastInbound = [...allThreads].reverse().find((t) => t.last_message_direction === "inbound");
  const recipientEmail = lastInbound?.last_message_from
    ? (parseAddress(lastInbound.last_message_from)?.email ?? null)
    : null;

  return (
    <PageShell>
      <PageHeader backHref="/dashboard" backLabel="Dashboard" />

      {/* Hero */}
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
              {healthScore}
            </p>
            <p className="mt-0.5 text-xs text-subtle-foreground">attention score</p>
          </div>
          {score?.dollar_at_risk ? (
            <div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-urgent">
                {formatMoney(score.dollar_at_risk)}
              </p>
              <p className="mt-0.5 text-xs text-subtle-foreground">at risk</p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <ContractValueInput clientId={client.id} initialValue={client.contract_value} />
        </div>
      </section>

      {!score ? (
        <p className="animate-fade-in-up rounded-xl border border-dashed border-border p-6 text-sm leading-relaxed text-muted-foreground">
          No scores computed yet — sync Gmail from the dashboard to analyze this relationship.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="animate-fade-in-up">
              <CardEyebrow>Communication trend</CardEyebrow>
              <div>
                <p className={`text-sm font-medium ${trend.text}`}>
                  <span aria-hidden>{trend.icon}</span> {trend.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-subtle-foreground">
                  {topReasons?.insights?.[0] ?? "Not enough reply history yet to tell."}
                </p>
              </div>
            </Card>

            <Card className="animate-fade-in-up" style={{ animationDelay: "60ms" }}>
              <CardEyebrow>Deal momentum</CardEyebrow>
              {momentum ? (
                <div>
                  <p className={`text-sm font-medium ${momentum.text}`}>
                    <span aria-hidden>{momentum.icon}</span> {momentum.label}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-subtle-foreground">
                    {topReasons?.insights?.find(
                      (s) =>
                        s.includes("volume") ||
                        s.includes("active back-and-forth") ||
                        s.includes("slowed")
                    ) ?? "Message frequency compared to last month."}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not enough activity yet.</p>
              )}
            </Card>
          </div>

          <Card className="animate-fade-in-up">
            <CardEyebrow>Potential risks</CardEyebrow>
            {topReasons?.reasons?.length ? (
              <ul className="flex flex-col gap-2">
                {topReasons.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span aria-hidden className={`mt-1.5 size-1 shrink-0 rounded-full ${meta.dot}`} />
                    <span className="min-w-0">{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sync Gmail again to refresh this client&apos;s analysis.
              </p>
            )}
          </Card>

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
              {topReasons?.confidence && (
                <Badge variant="outline">{topReasons.confidence} confidence</Badge>
              )}
            </div>
            <p className={`text-sm font-medium leading-relaxed ${meta.text}`}>
              {topReasons?.suggestedAction ?? "Sync Gmail again to refresh this client's analysis."}
            </p>
            {topReasons?.reasons?.length ? (
              <div className="border-t border-border pt-3">
                <p className="mb-1.5 text-xs font-medium text-subtle-foreground">Why</p>
                <ul className="flex flex-col gap-1">
                  {topReasons.reasons.map((reason) => (
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
              {intelligence && (
                <p className="mt-1.5 text-xs leading-relaxed text-subtle-foreground">
                  AI-generated by Claude, based on this client&apos;s recent conversations —
                  analyzed {relativeTime(intelligence.analyzed_at)}.
                </p>
              )}
            </div>

            {!intelligence ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Not analyzed yet — click{" "}
                <strong className="font-medium text-foreground">Analyze conversations</strong> on
                the dashboard to have Claude read this relationship&apos;s recent emails for
                objections, buying signals, and open questions.
              </p>
            ) : (
              <>
                {extraction?.relevant === false && (
                  <p className="rounded-lg border border-attention-border bg-attention-surface px-3 py-2 text-xs leading-relaxed text-attention">
                    Flagged as possibly not a real client relationship — worth a quick look before
                    trusting the analysis below.
                  </p>
                )}
                {intelligence.summary && (
                  <p className="text-sm leading-relaxed text-foreground">{intelligence.summary}</p>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <IntelligenceList label="Open questions" items={extraction?.open_questions} />
                  <IntelligenceList label="Objections" items={extraction?.objections} />
                  <IntelligenceList label="Buying signals" items={extraction?.buying_signals} />
                  <IntelligenceList
                    label="Hesitation signals"
                    items={extraction?.hesitation_signals}
                  />
                  <IntelligenceList label="Pricing mentions" items={extraction?.pricing_mentions} />
                  <IntelligenceList
                    label="Competitor mentions"
                    items={extraction?.competitor_mentions}
                  />
                </div>
                {extraction?.commitments && extraction.commitments.length > 0 && (
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
                  Builds up automatically each time this client is analyzed — updated{" "}
                  {relativeTime(memoryRow!.updated_at)}. Only facts stated in real conversations,
                  never guessed.
                </p>
              )}
            </div>

            {isEmptyMemory(memory) ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Nothing remembered yet — click{" "}
                <strong className="font-medium text-foreground">Analyze conversations</strong> on
                the dashboard and Claude will start building a profile for this client (decision
                maker, budget, preferences, goals) from what actually comes up in your emails.
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

          <DraftFollowUp clientId={client.id} recipientEmail={recipientEmail} />

          <Card className="animate-fade-in-up">
            <CardEyebrow>Timeline</CardEyebrow>
            {timelineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No thread history yet.</p>
            ) : (
              <ol className="relative flex flex-col gap-5 border-l border-border pl-5">
                {timelineItems.map((t) => (
                  <li key={t.gmail_thread_id} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[1.5625rem] top-1.5 size-2 rounded-full border-2 border-card bg-border-strong"
                    />
                    <p className="text-xs text-subtle-foreground">
                      {relativeDays(t.last_message_at)}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-foreground">
                      <span aria-hidden className="text-subtle-foreground">
                        {t.last_message_direction === "outbound" ? "↗" : "↙"}
                      </span>{" "}
                      {t.last_message_subject || "(no subject)"}
                    </p>
                    {t.last_message_snippet && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-subtle-foreground">
                        {t.last_message_snippet}
                      </p>
                    )}
                  </li>
                ))}
                <li className="relative">
                  <span
                    aria-hidden
                    className={`absolute -left-[1.5625rem] top-1.5 size-2 rounded-full border-2 border-card ${meta.dot}`}
                  />
                  <p className="text-xs text-subtle-foreground">now</p>
                  <p className={`mt-0.5 text-sm font-medium leading-snug ${meta.text}`}>
                    → {topReasons?.suggestedAction}
                  </p>
                </li>
              </ol>
            )}
          </Card>
        </>
      )}
    </PageShell>
  );
}
