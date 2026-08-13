"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientCard } from "@/components/client-card";
import { SyncingOverlay } from "@/components/syncing-overlay";
import { MorningBriefing } from "@/components/morning-briefing";
import { Walkthrough } from "@/components/walkthrough";
import type { ScoreRow } from "@/lib/types";

export function DashboardContent({
  userEmail,
  firstName,
  gmailConnected,
  clientCount,
  ranked,
  lastSyncedAt,
  reviewedClientCount,
  reviewedThreadCount,
  readyToAnalyzeCount,
}: {
  userEmail: string;
  firstName: string | null;
  gmailConnected: boolean;
  clientCount: number;
  ranked: ScoreRow[];
  lastSyncedAt: string | null;
  reviewedClientCount: number;
  reviewedThreadCount: number;
  readyToAnalyzeCount: number;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncMsg, setLastSyncMsg] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [lastAnalyzeMsg, setLastAnalyzeMsg] = useState<string | null>(null);

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

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    setLastAnalyzeMsg(null);

    const res = await fetch("/api/intelligence/analyze", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setAnalyzeError(data.error ?? "Analysis failed");
      setAnalyzing(false);
      return;
    }

    setLastAnalyzeMsg(
      data.analyzed > 0
        ? `Analyzed ${data.analyzed} conversation${data.analyzed === 1 ? "" : "s"}.`
        : "Nothing new to analyze."
    );
    setAnalyzing(false);
    router.refresh();
  }

  const needsAttention = [...ranked]
    .filter((r) => r.health_score >= 30)
    .sort((a, b) => b.health_score - a.health_score);
  const healthyCount = ranked.length - needsAttention.length;
  const urgentRows = needsAttention.filter((r) => r.health_score >= 60);
  const checkinRows = needsAttention.filter((r) => r.health_score < 60);

  return (
    <div className="flex flex-col gap-6">
      <Walkthrough />
      <MorningBriefing
        firstName={firstName}
        gmailConnected={gmailConnected}
        clientCount={clientCount}
        ranked={ranked}
        lastSyncedAt={lastSyncedAt}
        reviewedClientCount={reviewedClientCount}
        reviewedThreadCount={reviewedThreadCount}
        syncing={syncing}
        onSync={handleSync}
      />

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

      {readyToAnalyzeCount > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm">
            <div>
              <p className="text-slate-200">
                {readyToAnalyzeCount} client{readyToAnalyzeCount === 1 ? "" : "s"} ready for deeper
                analysis
              </p>
              <p className="text-xs text-slate-500">
                Claude reads recent conversations for objections, buying signals, and open
                questions — you choose when this runs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastAnalyzeMsg && !analyzing && (
                <span className="text-xs text-emerald-400">{lastAnalyzeMsg}</span>
              )}
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:bg-white disabled:opacity-60"
              >
                {analyzing ? "Analyzing…" : "Analyze conversations"}
              </button>
            </div>
          </div>
          {analyzeError && <p className="px-1 text-xs text-red-400">{analyzeError}</p>}
        </div>
      )}

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-1 text-sm font-medium text-slate-300">Who needs attention</h2>
        <p className="mb-4 text-xs text-slate-600">
          Newsletters, receipts, and automated mail are filtered out automatically — this is
          only real back-and-forth correspondence. Scores and reasons below are calculated
          directly from reply timing and volume, not AI — open a client to have Claude read the
          actual conversation for objections, buying signals, and open questions.
        </p>

        {syncing ? (
          <SyncingOverlay />
        ) : ranked.length === 0 ? (
          <p className="text-sm text-slate-500">
            {clientCount > 0
              ? "No attention scores yet — click Sync Gmail to compute them."
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
