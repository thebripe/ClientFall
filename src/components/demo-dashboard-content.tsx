"use client";

import Link from "next/link";
import { MorningBriefing } from "@/components/morning-briefing";
import { DemoClientCard } from "@/components/demo-client-card";
import { Card, CardEyebrow } from "@/components/ui/card";
import { DemoNotice } from "@/components/page-shell";
import { DEMO_CLIENTS, DEMO_HEALTHY_COUNT } from "@/lib/demo-data";
import type { ScoreRow } from "@/lib/types";
import { riskTier } from "@/lib/ui/risk";

// Computed once at module load, not during render — a demo "last synced"
// timestamp doesn't need to be live.
const DEMO_LAST_SYNCED_AT = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-subtle-foreground">
      {children}
    </h3>
  );
}

export function DemoDashboardContent() {
  const ranked: ScoreRow[] = DEMO_CLIENTS.map((fixture) => fixture.row);

  const needsAttention = [...ranked]
    .filter((r) => r.health_score >= 30)
    .sort((a, b) => b.health_score - a.health_score);
  const urgentRows = needsAttention.filter((r) => r.health_score >= 60);
  const checkinRows = needsAttention.filter((r) => r.health_score < 60);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <DemoNotice>
        You&apos;re viewing a live demo with sample data — no Gmail is connected and nothing here
        is real.{" "}
        <Link href="/" className="font-medium underline underline-offset-2">
          Connect your own Gmail
        </Link>{" "}
        to see this with your actual inbox.
      </DemoNotice>

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

      <div className="rounded-xl border border-border bg-card px-4 py-4">
        <p className="text-sm font-medium text-foreground">1 client ready for deeper analysis</p>
        <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
          In your real account, an <strong className="font-medium text-foreground">Analyze
          conversations</strong> button appears here. Open{" "}
          <strong className="font-medium text-foreground">Kessler Design Co</strong> below to see
          what &quot;not analyzed yet&quot; looks like before that runs.
        </p>
      </div>

      <Card>
        <div>
          <CardEyebrow>Who needs attention</CardEyebrow>
          <p className="mt-2 max-w-prose text-xs leading-relaxed text-muted-foreground">
            Newsletters, receipts, and automated mail are filtered out automatically — this is only
            real back-and-forth correspondence. Scores and reasons below are calculated directly
            from reply timing and volume, not AI — open a client to have Claude read the actual
            conversation for objections, buying signals, and open questions.
          </p>
        </div>

        <div className="flex flex-col gap-7">
          {urgentRows.length > 0 && (
            <div>
              <SectionLabel>Needs attention now ({urgentRows.length})</SectionLabel>
              <div className="flex flex-col gap-3">
                {urgentRows.map((row, i) => (
                  <DemoClientCard
                    key={row.clients!.id}
                    row={row}
                    tier={riskTier(row.health_score)}
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
                  <DemoClientCard
                    key={row.clients!.id}
                    row={row}
                    tier={riskTier(row.health_score)}
                    delayMs={(urgentRows.length + i) * 70}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="border-t border-border pt-5 text-xs text-subtle-foreground">
            {DEMO_HEALTHY_COUNT} other relationships look healthy — recently in touch, nothing to
            act on.
          </p>
        </div>
      </Card>
    </div>
  );
}
