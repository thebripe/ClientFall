"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "radar_walkthrough_seen";

const STEPS = [
  {
    title: "This is your morning briefing",
    body: "Every score and reason here comes from analyzing your actual reply patterns — how fast you respond, how often, and who's waiting on whom. Nothing here is guessed.",
  },
  {
    title: "Clients are ranked by urgency",
    body: "The list below sorts who needs attention first, with a plain-English reason and a recommended action for each.",
  },
  {
    title: "Click into a client for the full picture",
    body: "Reply-speed trends, message volume, and a visual timeline. Run \"Analyze conversations\" from here to have Claude read the actual emails for objections, buying signals, and open questions — that's the only part of this app that's AI, clearly labeled where it appears.",
  },
  {
    title: "Nothing happens without you",
    body: "Gmail access is read-only — Radar can't send, draft, or modify anything on its own. Follow-up drafts are yours to review, edit, and send yourself.",
  },
];

export function Walkthrough() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Reads a browser-only external system (localStorage) that doesn't exist
    // during SSR, so this can only be known once mounted on the client.
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-title"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="animate-fade-in-up w-full max-w-sm rounded-2xl border border-border bg-popover p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.9)]">
        {/* Progress pips read faster than "1 of 4" and take less space. */}
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-border-strong"
              }`}
            />
          ))}
        </div>

        <h2
          id="walkthrough-title"
          className="mt-5 text-base font-semibold tracking-tight text-foreground"
        >
          {current.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.body}</p>

        <div className="mt-6 flex items-center justify-between">
          <Button onClick={dismiss} variant="ghost" size="sm">
            Skip
          </Button>
          <Button onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}>
            {isLast ? "Got it" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
