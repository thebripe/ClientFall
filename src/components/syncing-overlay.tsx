"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Analyzing communication history…",
  "Calculating relationship health…",
  "Measuring reply-time trends…",
  "Detecting relationships going quiet…",
  "Generating recommendations…",
];

export function SyncingOverlay() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-3 py-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 rounded-lg animate-shimmer" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
      <p className="mt-1 text-center text-xs text-slate-500">{STEPS[step]}</p>
    </div>
  );
}
