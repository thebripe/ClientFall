"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS = [
  "Analyzing communication history…",
  "Calculating relationship health…",
  "Measuring reply-time trends…",
  "Detecting relationships going quiet…",
  "Generating recommendations…",
];

/** Skeleton shaped like the client cards it's standing in for, so the
 *  layout doesn't jump when real rows arrive. */
function ClientCardSkeleton({ delayMs }: { delayMs: number }) {
  return (
    <div
      className="animate-fade-in rounded-xl border border-border bg-card p-4 sm:p-5"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}

export function SyncingOverlay() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <ClientCardSkeleton key={i} delayMs={i * 90} />
      ))}
      <p className="animate-pulse-soft mt-1 text-center text-xs text-subtle-foreground">
        {STEPS[step]}
      </p>
    </div>
  );
}
