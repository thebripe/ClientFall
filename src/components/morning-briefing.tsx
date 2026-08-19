"use client";

import { CountUp } from "@/components/count-up";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/ui/risk";
import { relativeTime, timeOfDayGreeting } from "@/lib/ui/time";
import type { ScoreRow } from "@/lib/types";

function Stat({
  value,
  label,
  tone = "default",
}: {
  value: React.ReactNode;
  label: string;
  tone?: "default" | "urgent";
}) {
  return (
    <div>
      <p
        className={`text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${
          tone === "urgent" ? "text-urgent" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-subtle-foreground">{label}</p>
    </div>
  );
}

/**
 * The hero also carries account state (which mailbox, connection status)
 * and the sync action — these used to live in a separate strip below,
 * which was an extra surface saying very little.
 */
export function MorningBriefing({
  firstName,
  userEmail,
  gmailConnected,
  clientCount,
  ranked,
  lastSyncedAt,
  reviewedClientCount,
  reviewedThreadCount,
  syncing,
  onSync,
  syncMessage,
  syncError,
  readOnly = false,
}: {
  firstName: string | null;
  userEmail: string;
  gmailConnected: boolean;
  clientCount: number;
  ranked: ScoreRow[];
  lastSyncedAt: string | null;
  reviewedClientCount: number;
  reviewedThreadCount: number;
  syncing: boolean;
  onSync: () => void;
  syncMessage?: string | null;
  syncError?: string | null;
  readOnly?: boolean;
}) {
  const needsAttention = ranked.filter((r) => r.health_score >= 30);
  const highPriority = needsAttention.filter((r) => r.health_score >= 60);
  const totalAtRisk = needsAttention.reduce((sum, r) => sum + (r.dollar_at_risk ?? 0), 0);
  const top = needsAttention[0];

  const greeting = `${timeOfDayGreeting()}${firstName ? `, ${firstName}` : ""}.`;

  return (
    <section className="animate-fade-in-up surface-glow relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-background p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
            suppressHydrationWarning
          >
            {greeting}
          </h2>

          {lastSyncedAt ? (
            <p
              className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground"
              suppressHydrationWarning
            >
              Reviewed {reviewedClientCount} client relationship
              {reviewedClientCount === 1 ? "" : "s"} across {reviewedThreadCount} conversation
              {reviewedThreadCount === 1 ? "" : "s"} since your last sync (
              {relativeTime(lastSyncedAt)}).
            </p>
          ) : (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {clientCount > 0
                ? "You've synced before — run it again to bring this up to date."
                : "We only surface real back-and-forth correspondence — newsletters and automated mail are filtered out automatically."}
            </p>
          )}

          <p className="mt-3 flex items-center gap-2 text-xs text-subtle-foreground">
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${
                gmailConnected ? "bg-healthy" : "bg-attention"
              }`}
            />
            <span className="truncate">{userEmail}</span>
          </p>
        </div>

        {!readOnly && gmailConnected && (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Button onClick={onSync} disabled={syncing} variant={ranked.length ? "outline" : "default"}>
              {syncing ? "Syncing…" : "Sync Gmail"}
            </Button>
            {syncMessage && !syncing && (
              <span className="animate-fade-in text-xs text-healthy">{syncMessage}</span>
            )}
            {syncError && <span className="text-xs text-urgent">{syncError}</span>}
          </div>
        )}
      </div>

      {ranked.length > 0 && (
        <div className="mt-7">
          {needsAttention.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-healthy-border bg-healthy-surface px-4 py-3.5">
              <span aria-hidden className="size-1.5 rounded-full bg-healthy" />
              <p className="text-sm font-medium text-healthy">
                You&apos;re all caught up — every relationship looks healthy.
              </p>
            </div>
          ) : (
            top && (
              <div className="rounded-xl border border-border bg-background/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-subtle-foreground">
                    Most urgent
                  </p>
                  {top.top_reasons_json?.actionLabel && (
                    <Badge variant="urgent">{top.top_reasons_json.actionLabel}</Badge>
                  )}
                </div>
                <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  {top.clients!.name}
                </p>
                <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {top.top_reasons_json?.reasons?.[0]}
                </p>
                {top.dollar_at_risk ? (
                  <p className="mt-3 text-xs text-subtle-foreground">
                    <span className="text-urgent">{formatMoney(top.dollar_at_risk)}</span> at risk
                    on this one
                  </p>
                ) : null}
              </div>
            )
          )}
        </div>
      )}

      {ranked.length > 0 && needsAttention.length > 0 && (
        <div className="mt-7 flex flex-wrap gap-x-12 gap-y-5 border-t border-border pt-6">
          <Stat value={<CountUp value={highPriority.length} />} label="high priority" />
          <Stat value={<CountUp value={needsAttention.length} />} label="recommended actions" />
          {totalAtRisk > 0 && (
            <Stat
              tone="urgent"
              value={<CountUp value={totalAtRisk} formatter={formatMoney} />}
              label="at risk right now"
            />
          )}
        </div>
      )}
    </section>
  );
}
