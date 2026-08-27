import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContractValueInput } from "@/components/contract-value-input";
import { DraftFollowUp } from "@/components/draft-followup";
import { PageHeader, PageShell } from "@/components/page-shell";
import {
  AIMemoryCard,
  ConversationIntelligenceCard,
} from "@/components/intelligence-sections";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow } from "@/components/ui/card";
import { RISK_META, formatMoney, relativeDays, riskTier } from "@/lib/ui/risk";
import { relativeTime } from "@/lib/ui/time";
import { parseAddress } from "@/lib/google/gmail";
import type { ClientIntelligenceExtraction, ClientMemory, TopReasons } from "@/lib/types";

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
  unknown: { label: "Not enough history", icon: "·", text: "text-subtle-foreground" },
} as const;

function Signal({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string;
  tone: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-subtle-foreground">
        {label}
      </p>
      <p className={`mt-1 text-sm font-medium ${tone}`}>{value}</p>
      {detail && <p className="mt-0.5 text-xs leading-relaxed text-subtle-foreground">{detail}</p>}
    </div>
  );
}

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
  const lastContactAt = allThreads[allThreads.length - 1]?.last_message_at ?? null;
  const extraction = (intelligence?.extraction_json as ClientIntelligenceExtraction | null) ?? null;
  const memory = (memoryRow?.memory_json as ClientMemory | null) ?? null;

  // Best-effort recipient for the "Open in email" link: the sender of the
  // most recent inbound message, since that's the client's own address.
  const lastInbound = [...allThreads].reverse().find((t) => t.last_message_direction === "inbound");
  const recipientEmail = lastInbound?.last_message_from
    ? (parseAddress(lastInbound.last_message_from)?.email ?? null)
    : null;

  const volumeInsight = topReasons?.insights?.find(
    (s) => s.includes("volume") || s.includes("active back-and-forth") || s.includes("slowed")
  );

  return (
    <PageShell>
      <PageHeader backHref="/dashboard" backLabel="Dashboard" />

      {/* Hero: identity, the numbers, and the two trend signals that explain
          them — previously these were two separate cards further down. */}
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
              {healthScore}
            </p>
            <p className="mt-1 text-xs text-subtle-foreground">attention score</p>
          </div>
          {/* The real value entered below, not a derived fraction of it. */}
          {typeof client.contract_value === "number" && client.contract_value > 0 ? (
            <div>
              <p className={`text-3xl font-semibold tabular-nums tracking-tight ${meta.text}`}>
                {formatMoney(client.contract_value)}
              </p>
              <p className="mt-1 text-xs text-subtle-foreground">deal value at risk</p>
            </div>
          ) : null}
          {lastContactAt && (
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {relativeDays(lastContactAt)}
              </p>
              <p className="mt-1 text-xs text-subtle-foreground">last contact</p>
            </div>
          )}
        </div>

        {score && (
          <div className="mt-7 grid grid-cols-1 gap-5 border-t border-border pt-6 sm:grid-cols-2">
            <Signal
              label="Communication"
              value={`${trend.icon} ${trend.label}`}
              tone={trend.text}
              detail={topReasons?.insights?.[0] ?? "Not enough reply history yet to tell."}
            />
            <Signal
              label="Momentum"
              value={momentum ? `${momentum.icon} ${momentum.label}` : "Not enough activity"}
              tone={momentum ? momentum.text : "text-subtle-foreground"}
              detail={volumeInsight ?? "Message frequency compared to last month."}
            />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-5">
          <span className="text-xs text-subtle-foreground">
            Deal value — set manually, never guessed:
          </span>
          <ContractValueInput clientId={client.id} initialValue={client.contract_value} />
        </div>
      </section>

      {!score ? (
        <p className="animate-fade-in-up rounded-xl border border-dashed border-border p-6 text-sm leading-relaxed text-muted-foreground">
          No scores computed yet — sync Gmail from the dashboard to analyze this relationship.
        </p>
      ) : (
        <>
          {/* Action first: this is the thing you came here to do. The reason
              list lives here only — it used to be duplicated verbatim in a
              separate "Potential risks" card directly above. */}
          <Card className="animate-fade-in-up relative overflow-hidden">
            <span aria-hidden className={`absolute inset-y-0 left-0 w-[2px] ${meta.dot}`} />
            <div className="flex flex-wrap items-start justify-between gap-3">
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

            <p className={`text-base font-medium leading-relaxed ${meta.text}`}>
              {topReasons?.suggestedAction ?? "Sync Gmail again to refresh this client's analysis."}
            </p>

            {topReasons?.reasons?.length ? (
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium text-subtle-foreground">Why</p>
                <ul className="flex flex-col gap-2">
                  {topReasons.reasons.map((reason) => (
                    <li
                      key={reason}
                      className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 size-1 shrink-0 rounded-full ${meta.dot}`}
                      />
                      <span className="min-w-0">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          {/* Immediately after the action, because it's how you do it. */}
          <DraftFollowUp mode="live" clientId={client.id} recipientEmail={recipientEmail} />

          <ConversationIntelligenceCard
            summary={intelligence?.summary ?? null}
            extraction={extraction}
            analyzedLabel={intelligence ? relativeTime(intelligence.analyzed_at) : null}
            emptyState={
              <>
                Not analyzed yet — click{" "}
                <strong className="font-medium text-foreground">Analyze conversations</strong> on
                the dashboard to have Claude read this relationship&apos;s recent emails for
                objections, buying signals, and open questions.
              </>
            }
          />

          <AIMemoryCard
            memory={memory}
            updatedLabel={memoryRow ? relativeTime(memoryRow.updated_at) : null}
            emptyState={
              <>
                Nothing remembered yet — click{" "}
                <strong className="font-medium text-foreground">Analyze conversations</strong> on
                the dashboard and Claude will start building a profile for this client (decision
                maker, budget, preferences, goals) from what actually comes up in your emails.
              </>
            }
          />

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
