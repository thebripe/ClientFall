"use client";

import { useEffect, useState } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="animate-fade-in-up w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <p className="text-xs text-slate-500">
          {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-100">{current.title}</h2>
        <p className="mt-2 text-sm text-slate-400">{current.body}</p>

        <div className="mt-5 flex items-center justify-between">
          <button onClick={dismiss} className="text-xs text-slate-500 hover:text-slate-300">
            Skip
          </button>
          <button
            onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
            className="rounded-md bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-white"
          >
            {isLast ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
