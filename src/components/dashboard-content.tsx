"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CountUp } from "@/components/count-up";
import { ClientCard } from "@/components/client-card";
import { SyncingOverlay } from "@/components/syncing-overlay";
import { formatMoney } from "@/lib/ui/risk";
import type { ScoreRow } from "@/lib/types";

export function DashboardContent({
  userEmail,
  gmailConnected,
  clientCount,
  ranked,
}: {
  userEmail: string;
  gmailConnected: boolean;
  clientCount: number;
  ranked: ScoreRow[];
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncMsg, setLastSyncMsg] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    setLastSyncMsg(null);

    const res = await fetch("/api/gmail/sync", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setSyncError(data.error ?? "Sync failed");
      setSyncing(false);
      return;
    }

    setLastSyncMsg(
      `Found ${data.clients} client${data.clients === 1 ? "" : "s"} across ${data.threads} thread${
        data.threads === 1 ? "" : "s"
      }.`
    );
    setSyncing(false);
    router.refresh();
  }

  const needsAttention = [...ranked]
    .filter((r) => r.health_score >= 30)
    .sort((a, b) => b.health_score - a.health_score);
  const healthyCount = ranked.length - needsAttention.length;
  const totalAtRisk = needsAttention.reduce((sum, r) => sum + (r.dollar_at_risk ?? 0), 0);
  const urgentRows = needsAttention.filter((r) => r.health_score >= 60);
  const checkinRows = needsAttention.filter((r) => r.health_score < 60);
  const topRow = needsAttention[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
        {ranked.length === 0 ? (
          <div className="animate-fade-in-up flex flex-col gap-3">
            <p className="text-lg font-medium text-slate-200">
              {clientCount > 0
                ? "Ready to compute today's insights."
                : "Connect your inbox and we'll show you exactly who needs a reply."}
            </p>
            <p className="text-sm text-slate-500">
              {clientCount > 0
                ? "You've synced before — run it again to refresh today's scores."
                : "We only surface real back-and-forth correspondence — newsletters and automated mail are filtered out."}
            </p>
            {gmailConnected && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-fit rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:opacity-60"
              >
                {syncing ? "Syncing…" : "Sync Gmail"}
              </button>
            )}
          </div>
        ) : needsAttention.length === 0 ? (
          <div className="animate-fade-in-up">
            <p className="text-lg font-medium text-emerald-300">
              ✓ Great work. All active relationships appear healthy.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {ranked.length} relationship{ranked.length === 1 ? "" : "s"} tracked — nothing needs
              action today.
            </p>
          </div>
        ) : (
          <div className="animate-fade-in-up flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <p className="text-4xl font-semibold tabular-nums">
                  <CountUp value={needsAttention.length} />
                </p>
                <p className="text-sm text-slate-500">
                  client{needsAttention.length === 1 ? "" : "s"} need attention today
                </p>
              </div>
              {totalAtRisk > 0 && (
                <div>
                  <p className="text-4xl font-semibold tabular-nums text-red-300">
                    <CountUp value={totalAtRisk} formatter={formatMoney} />
                  </p>
                  <p className="text-sm text-slate-500">at risk right now</p>
                </div>
              )}
            </div>
            {topRow && (
              <div className="rounded-lg border border-slate-800 bg-black/20 p-4">
                <p className="text-sm">
                  <span className="font-semibold">{topRow.clients!.name}</span>
                  <span className="text-slate-400">: {topRow.top_reasons_json?.reasons?.[0]}</span>
                </p>
                {topRow.top_reasons_json?.suggestedAction && (
                  <p className="mt-1 text-sm text-slate-400">
                    → {topRow.top_reasons_json.suggestedAction}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${gmailConnected ? "bg-emerald-400" : "bg-amber-400"}`}
            />
            <span className="text-slate-400">{userEmail}</span>
          </div>
          {gmailConnected && ranked.length > 0 && (
            <div className="flex items-center gap-3">
              {lastSyncMsg && !syncing && (
                <span className="text-xs text-emerald-400">{lastSyncMsg}</span>
              )}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
              >
                {syncing ? "Syncing…" : "Sync Gmail"}
              </button>
            </div>
          )}
        </div>
        {syncError && <p className="px-1 text-xs text-red-400">{syncError}</p>}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-1 text-sm font-medium text-slate-300">Who needs attention</h2>
        <p className="mb-4 text-xs text-slate-600">
          Newsletters, receipts, and automated mail are filtered out automatically — this is
          only real back-and-forth correspondence.
        </p>

        {syncing ? (
          <SyncingOverlay />
        ) : ranked.length === 0 ? (
          <p className="text-sm text-slate-500">
            {clientCount > 0
              ? "No attention scores for today yet — click Sync Gmail to compute them."
              : "No clients yet — click Sync Gmail to pull threads from the last 60 days and find out who needs a reply."}
          </p>
        ) : needsAttention.length === 0 ? (
          <p className="text-sm text-slate-500">No clients currently require immediate attention.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {urgentRows.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Needs attention now ({urgentRows.length})
                </h3>
                <div className="flex flex-col gap-3">
                  {urgentRows.map((row, i) => (
                    <ClientCard key={row.clients!.id} row={row} tier="urgent" delayMs={i * 60} />
                  ))}
                </div>
              </div>
            )}

            {checkinRows.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Worth a check-in ({checkinRows.length})
                </h3>
                <div className="flex flex-col gap-3">
                  {checkinRows.map((row, i) => (
                    <ClientCard
                      key={row.clients!.id}
                      row={row}
                      tier="checkin"
                      delayMs={(urgentRows.length + i) * 60}
                    />
                  ))}
                </div>
              </div>
            )}

            {healthyCount > 0 && (
              <p className="border-t border-slate-800 pt-4 text-xs text-slate-600">
                {healthyCount} other relationship{healthyCount === 1 ? "" : "s"} look healthy —
                recently in touch, nothing to act on.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
