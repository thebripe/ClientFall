"use client";

import { useState } from "react";
import type { DemoDraft } from "@/lib/demo-data";

// Same UI/UX as the real DraftFollowUp, but resolves from a canned
// fixture after a simulated delay instead of calling /api/intelligence/draft.
export function DemoDraftFollowUp({ draft }: { draft: DemoDraft }) {
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [subject, setSubject] = useState(draft.canDraft ? draft.subject : "");
  const [body, setBody] = useState(draft.canDraft ? draft.draft : "");
  const [copied, setCopied] = useState(false);

  function handleDraft() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setRevealed(true);
    }, 1100);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const mailtoHref = draft.canDraft
    ? `mailto:${encodeURIComponent(draft.recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : undefined;

  return (
    <section className="animate-fade-in-up rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Draft follow-up</h2>
        <button
          onClick={handleDraft}
          disabled={loading}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Drafting…" : revealed ? "Regenerate" : "Draft follow-up"}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        AI-generated from this conversation&apos;s history and open questions. Nothing is ever
        sent automatically — review and edit before use. (Simulated in this demo — no real API
        call.)
      </p>

      {revealed && !draft.canDraft && (
        <p className="mt-3 text-sm text-slate-400">
          Not enough specific context to draft something meaningful: {draft.reason}
        </p>
      )}

      {revealed && draft.canDraft && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-slate-600">{draft.reason}</p>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:bg-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            {mailtoHref && (
              <a
                href={mailtoHref}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
              >
                Open in email
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
