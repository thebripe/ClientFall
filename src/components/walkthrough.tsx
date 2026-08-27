"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Unchanged on purpose: renaming this would re-show the walkthrough to
// everyone who has already dismissed it. Shared between the real app and
// /demo, so seeing the tour once counts everywhere.
const STORAGE_KEY = "radar_walkthrough_seen";

/** localStorage throws outright in some privacy modes and in-app webviews
 *  (Safari with cookies blocked, for one). An onboarding nicety must never
 *  be able to take the dashboard down with it. */
function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Non-fatal: the tour will simply show again next visit.
  }
}

type Step = { title: string; body: string };

const SYNC_STEP_LIVE: Step = {
  title: "Start with a sync",
  body: "Hit “Sync Gmail” and Clientfall reads your last 60 days of real back-and-forth — read-only. Newsletters, receipts, and automated mail are filtered out, so only genuine client conversations come through.",
};

const SYNC_STEP_DEMO: Step = {
  title: "You're looking at sample data",
  body: "Nothing here is a real client — it's a fixed set of examples so you can try every feature without connecting an inbox. In the real app this screen fills in after one click of “Sync Gmail”, which reads your last 60 days read-only.",
};

const SHARED_STEPS: Step[] = [
  {
    title: "Your morning briefing",
    body: "The top of the page answers one question: who needs you first. Scores and reasons come from your actual reply patterns — how fast you respond, how often, and who's waiting on whom. Dollar figures only ever show for clients you've given a deal value.",
  },
  {
    title: "Clients ranked by urgency",
    body: "Below the briefing, everyone is sorted by how much attention they need, each with a plain-English reason and a recommended next step. Healthy relationships collapse to a single line so the list stays short.",
  },
  {
    title: "Open a client for the full picture",
    body: "Reply-speed trends, a visual timeline, and “Draft follow-up” — one click writes a reply that references something actually said in the thread, like an open question or a promise you made. You edit it, then copy it or open it in your mail app.",
  },
  {
    title: "Nothing happens without you",
    body: "Gmail access is read-only — Clientfall can't send, draft, or modify anything in your account. Every follow-up is yours to review and send yourself.",
  },
];

export function Walkthrough({ mode = "live" }: { mode?: "live" | "demo" }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const steps: Step[] = [mode === "demo" ? SYNC_STEP_DEMO : SYNC_STEP_LIVE, ...SHARED_STEPS];

  useEffect(() => {
    // Reads a browser-only external system (localStorage) that doesn't exist
    // during SSR, so this can only be known once mounted on the client.
    if (!safeRead(STORAGE_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    safeWrite(STORAGE_KEY, "1");
    setVisible(false);
  }, []);

  // Escape to dismiss, and keep Tab inside the dialog — it claims
  // aria-modal, so focus escaping to the page behind it is a real bug.
  useEffect(() => {
    if (!visible) return;

    dialogRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>("button");
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, dismiss]);

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-title"
        tabIndex={-1}
        className="animate-fade-in-up w-full max-w-sm rounded-2xl border border-border bg-popover p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.9)] outline-none"
      >
        {/* Progress pips read faster than "1 of 5" and take less space. */}
        <div
          className="flex items-center gap-1.5"
          role="img"
          aria-label={`Step ${step + 1} of ${steps.length}`}
        >
          {steps.map((_, i) => (
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

        <div className="mt-6 flex items-center justify-between gap-2">
          <Button onClick={dismiss} variant="ghost" size="sm">
            Skip
          </Button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button onClick={() => setStep((s) => s - 1)} variant="outline" size="sm">
                Back
              </Button>
            )}
            <Button onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}>
              {isLast ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
