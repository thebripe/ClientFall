"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientCard } from "@/components/client-card";
import { SyncingOverlay } from "@/components/syncing-overlay";
import { MorningBriefing } from "@/components/morning-briefing";
import { Walkthrough } from "@/components/walkthrough";
import { Button } from "@/components/ui/button";
import type { ScoreRow } from "@/lib/types";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-subtle-foreground">
      {children}
    </h3>
  );
}

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
    <div className="flex flex-col gap-8 sm:gap-10">
      <Walkthrough />

      <MorningBriefing
        firstName={firstName}
        userEmail={userEmail}
        gmailConnected={gmailConnected}
        clientCount={clientCount}
        ranked={ranked}
        lastSyncedAt={lastSyncedAt}
        reviewedClientCount={reviewedClientCount}
        reviewedThreadCount={reviewedThreadCount}
        syncing={syncing}
        onSync={handleSync}
        syncMessage={lastSyncMsg}
        syncError={syncError}
      />

      {readyToAnalyzeCount > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4">
            <div className="min-w-0 max-w-prose">
              <p className="text-sm font-medium text-foreground">
                {readyToAnalyzeCount} client{readyToAnalyzeCount === 1 ? "" : "s"} ready for deeper
                analysis
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Claude reads recent conversations for objections, buying signals, and open
                questions — you choose when this runs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastAnalyzeMsg && !analyzing && (
                <span className="animate-fade-in text-xs text-healthy">{lastAnalyzeMsg}</span>
              )}
              <Button onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? "Analyzing…" : "Analyze conversations"}
              </Button>
            </div>
          </div>
          {analyzeError && <p className="px-1 text-xs text-urgent">{analyzeError}</p>}
        </div>
      )}

      {/* No outer card here on purpose — wrapping cards inside another card
          made the page read as boxes-in-boxes. The heading anchors the
          section and the rows sit directly on the page. */}
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-medium text-foreground">Who needs attention</h2>
          <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
            Only real back-and-forth correspondence — newsletters, receipts, and automated mail are
            filtered out. Scores are calculated from reply timing and volume, not AI; open a client
            for Claude&apos;s read of the actual conversation.
          </p>
        </div>

        {syncing ? (
          <SyncingOverlay />
        ) : ranked.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm leading-relaxed text-muted-foreground">
            {clientCount > 0
              ? "No attention scores yet — click Sync Gmail to compute them."
              : "No clients yet — click Sync Gmail to pull threads from the last 60 days and find out who needs a reply."}
          </p>
        ) : needsAttention.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No clients currently require immediate attention.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {urgentRows.length > 0 && (
              <div>
                <SectionLabel>Needs attention now ({urgentRows.length})</SectionLabel>
                <div className="flex flex-col gap-3">
                  {urgentRows.map((row, i) => (
                    <ClientCard
                      key={row.clients!.id}
                      row={row}
                      tier="urgent"
                      href={`/dashboard/clients/${row.clients!.id}`}
                      editableContractValue
                      delayMs={i * 70}
                    />
                  ))}
                </div>
              </div>
            )}

            {checkinRows.length > 0 && (
              <div>
                <SectionLabel>Worth a check-in ({checkinRows.length})</SectionLabel>
                <div className="flex flex-col gap-3">
                  {checkinRows.map((row, i) => (
                    <ClientCard
                      key={row.clients!.id}
                      row={row}
                      tier="checkin"
                      href={`/dashboard/clients/${row.clients!.id}`}
                      editableContractValue
                      delayMs={(urgentRows.length + i) * 70}
                    />
                  ))}
                </div>
              </div>
            )}

            {healthyCount > 0 && (
              <p className="border-t border-border pt-5 text-xs text-subtle-foreground">
                {healthyCount} other relationship{healthyCount === 1 ? "" : "s"} look healthy —
                recently in touch, nothing to act on.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
