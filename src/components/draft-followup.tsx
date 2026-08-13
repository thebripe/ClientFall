"use client";

import { useState } from "react";

type DraftResult = {
  canDraft: boolean;
  reason: string;
  subject: string;
  draft: string;
};

export function DraftFollowUp({ clientId, recipientEmail }: { clientId: string; recipientEmail: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftResult | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleDraft() {
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    const res = await fetch("/api/intelligence/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Could not generate a draft");
      setLoading(false);
      return;
    }

    setResult(data);
    setSubject(data.subject ?? "");
    setBody(data.draft ?? "");
    setLoading(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const mailtoHref = recipientEmail
    ? `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : undefined;

  return (
    <section className="animate-fade-in-up rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Draft follow-up
        </h2>
        <button
          onClick={handleDraft}
          disabled={loading}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Drafting…" : result ? "Regenerate" : "Draft follow-up"}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        AI-generated from this conversation&apos;s history and open questions. Nothing is ever
        sent automatically — review and edit before use.
      </p>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {result && !result.canDraft && (
        <p className="mt-3 text-sm text-slate-400">
          Not enough specific context to draft something meaningful: {result.reason}
        </p>
      )}

      {result && result.canDraft && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-slate-600">{result.reason}</p>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none"
            placeholder="Subject"
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
