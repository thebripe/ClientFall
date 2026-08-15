"use client";

import Link from "next/link";
import { MorningBriefing } from "@/components/morning-briefing";
import { DemoClientCard } from "@/components/demo-client-card";
import { DEMO_CLIENTS, DEMO_HEALTHY_COUNT } from "@/lib/demo-data";
import type { ScoreRow } from "@/lib/types";
import { riskTier } from "@/lib/ui/risk";

// Computed once at module load, not during render — a demo "last synced"
// timestamp doesn't need to be live.
const DEMO_LAST_SYNCED_AT = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

export function DemoDashboardContent() {
  const ranked: ScoreRow[] = DEMO_CLIENTS.map((fixture) => fixture.row);

  const needsAttention = [...ranked].filter((r) => r.health_score >= 30).sort((a, b) => b.health_score - a.health_score);
  const urgentRows = needsAttention.filter((r) => r.health_score >= 60);
  const checkinRows = needsAttention.filter((r) => r.health_score < 60);

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-in-up rounded-lg border border-amber-900/40 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">
        You&apos;re viewing a live demo with sample data — no Gmail is connected and nothing here
        is real.{" "}
        <Link href="/" className="underline underline-offset-2">
          Connect your own Gmail
        </Link>{" "}
        to see this with your actual inbox.
      </div>

      <MorningBriefing
        firstName="Alex"
        gmailConnected
        clientCount={DEMO_CLIENTS.length}
        ranked={ranked}
        lastSyncedAt={DEMO_LAST_SYNCED_AT}
        reviewedClientCount={DEMO_CLIENTS.length}
        reviewedThreadCount={DEMO_CLIENTS.length + 2}
        syncing={false}
        onSync={() => {}}
      />

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm">
        <p className="text-slate-200">1 client ready for deeper analysis</p>
        <p className="text-xs text-slate-500">
          In your real account, an <strong>Analyze conversations</strong> button appears here.
          Open <strong>Kessler Design Co</strong> below to see what &quot;not analyzed yet&quot;
          looks like before that runs.
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-1 text-sm font-medium text-slate-300">Who needs attention</h2>
        <p className="mb-4 text-xs text-slate-600">
          Newsletters, receipts, and automated mail are filtered out automatically — this is
          only real back-and-forth correspondence. Scores and reasons below are calculated
          directly from reply timing and volume, not AI — open a client to have Claude read the
          actual conversation for objections, buying signals, and open questions.
        </p>

        <div className="flex flex-col gap-6">
          {urgentRows.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Needs attention now ({urgentRows.length})
              </h3>
              <div className="flex flex-col gap-3">
                {urgentRows.map((row, i) => (
                  <DemoClientCard key={row.clients!.id} row={row} tier={riskTier(row.health_score)} delayMs={i * 60} />
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
                  <DemoClientCard
                    key={row.clients!.id}
                    row={row}
                    tier={riskTier(row.health_score)}
                    delayMs={(urgentRows.length + i) * 60}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="border-t border-slate-800 pt-4 text-xs text-slate-600">
            {DEMO_HEALTHY_COUNT} other relationships look healthy — recently in touch, nothing to
            act on.
          </p>
        </div>
      </div>
    </div>
  );
}
