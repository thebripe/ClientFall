"use client";

import Link from "next/link";
import { MorningBriefing } from "@/components/morning-briefing";
import { ClientCard } from "@/components/client-card";
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
    <div className="flex flex-col gap-8 sm:gap-10">
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
        userEmail="alex@studio.example"
        gmailConnected
        clientCount={DEMO_CLIENTS.length}
        ranked={ranked}
        lastSyncedAt={DEMO_LAST_SYNCED_AT}
        reviewedClientCount={DEMO_CLIENTS.length}
        reviewedThreadCount={DEMO_CLIENTS.length + 2}
        syncing={false}
        onSync={() => {}}
        readOnly
      />

      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <p className="text-sm font-medium text-foreground">1 client ready for deeper analysis</p>
        <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
          In your real account, an{" "}
          <strong className="font-medium text-foreground">Analyze conversations</strong> button
          appears here. Open{" "}
          <strong className="font-medium text-foreground">Kessler Design Co</strong> below to see
          what &quot;not analyzed yet&quot; looks like before that runs.
        </p>
      </div>

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-medium text-foreground">Who needs attention</h2>
          <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
            Only real back-and-forth correspondence — newsletters, receipts, and automated mail are
            filtered out. Scores are calculated from reply timing and volume, not AI; open a client
            for Claude&apos;s read of the actual conversation.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {urgentRows.length > 0 && (
            <div>
              <SectionLabel>Needs attention now ({urgentRows.length})</SectionLabel>
              <div className="flex flex-col gap-3">
                {urgentRows.map((row, i) => (
                  <ClientCard
                    key={row.clients!.id}
                    row={row}
                    tier={riskTier(row.health_score)}
                    href={`/demo/clients/${row.clients!.id}`}
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
                    tier={riskTier(row.health_score)}
                    href={`/demo/clients/${row.clients!.id}`}
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
      </section>
    </div>
  );
}
