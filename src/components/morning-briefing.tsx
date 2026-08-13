"use client";

import { CountUp } from "@/components/count-up";
import { formatMoney } from "@/lib/ui/risk";
import { relativeTime, timeOfDayGreeting } from "@/lib/ui/time";
import type { ScoreRow } from "@/lib/types";

export function MorningBriefing({
  firstName,
  gmailConnected,
  clientCount,
  ranked,
  lastSyncedAt,
  reviewedClientCount,
  reviewedThreadCount,
  syncing,
  onSync,
}: {
  firstName: string | null;
  gmailConnected: boolean;
  clientCount: number;
  ranked: ScoreRow[];
  lastSyncedAt: string | null;
  reviewedClientCount: number;
  reviewedThreadCount: number;
  syncing: boolean;
  onSync: () => void;
}) {
  const needsAttention = ranked.filter((r) => r.health_score >= 30);
  const highPriority = needsAttention.filter((r) => r.health_score >= 60);
  const totalAtRisk = needsAttention.reduce((sum, r) => sum + (r.dollar_at_risk ?? 0), 0);
  const top = needsAttention[0];

  const greeting = `${timeOfDayGreeting()}${firstName ? `, ${firstName}` : ""}.`;

  return (
    <div className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-7">
      <h2 className="text-2xl font-medium text-slate-100" suppressHydrationWarning>
        {greeting}
      </h2>

      {lastSyncedAt ? (
        <p className="mt-1 text-sm text-slate-500" suppressHydrationWarning>
          Reviewed {reviewedClientCount} client relationship{reviewedClientCount === 1 ? "" : "s"}{" "}
          across {reviewedThreadCount} conversation{reviewedThreadCount === 1 ? "" : "s"} since
          your last sync ({relativeTime(lastSyncedAt)}).
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">
          {clientCount > 0
            ? "You've synced before — run it again to bring this up to date."
            : "We only surface real back-and-forth correspondence — newsletters and automated mail are filtered out automatically."}
        </p>
      )}

      <div className="mt-6">
        {ranked.length === 0 ? (
          gmailConnected && (
            <button
              onClick={onSync}
              disabled={syncing}
              className="w-fit rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:opacity-60"
            >
              {syncing ? "Syncing…" : "Sync Gmail"}
            </button>
          )
        ) : needsAttention.length === 0 ? (
          <p className="text-lg font-medium text-emerald-300">
            ✓ You&apos;re all caught up — every relationship looks healthy.
          </p>
        ) : (
          top && (
            <div className="rounded-xl border border-slate-800 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Most urgent</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{top.clients!.name}</p>
              <p className="mt-1 text-sm text-slate-400">{top.top_reasons_json?.reasons?.[0]}</p>
              {top.top_reasons_json?.actionLabel && (
                <span className="mt-3 inline-block rounded-full bg-red-400/10 px-3 py-1 text-sm font-medium text-red-300">
                  {top.top_reasons_json.actionLabel}
                </span>
              )}
              {top.dollar_at_risk ? (
                <p className="mt-2 text-xs text-slate-500">
                  {formatMoney(top.dollar_at_risk)} at risk on this one
                </p>
              ) : null}
            </div>
          )
        )}
      </div>

      {ranked.length > 0 && needsAttention.length > 0 && (
        <div className="mt-5 flex gap-6">
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              <CountUp value={highPriority.length} />
            </p>
            <p className="text-xs text-slate-500">high priority</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              <CountUp value={needsAttention.length} />
            </p>
            <p className="text-xs text-slate-500">recommended actions</p>
          </div>
          {totalAtRisk > 0 && (
            <div>
              <p className="text-2xl font-semibold tabular-nums text-red-300">
                <CountUp value={totalAtRisk} formatter={formatMoney} />
              </p>
              <p className="text-xs text-slate-500">at risk right now</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
