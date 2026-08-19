"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import { DraftSkeleton } from "@/components/draft-followup";
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
    ? `mailto:${encodeURIComponent(draft.recipientEmail)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`
    : undefined;

  return (
    <Card className="animate-fade-in-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-prose">
          <CardEyebrow>Draft follow-up</CardEyebrow>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            AI-generated from this conversation&apos;s history and open questions. Nothing is ever
            sent automatically — review and edit before use. (Simulated in this demo — no real API
            call.)
          </p>
        </div>
        <Button onClick={handleDraft} disabled={loading} variant={revealed ? "outline" : "default"}>
          {loading ? "Drafting…" : revealed ? "Regenerate" : "Draft follow-up"}
        </Button>
      </div>

      {loading && <DraftSkeleton />}

      {!loading && revealed && !draft.canDraft && (
        <p className="animate-fade-in rounded-lg border border-border bg-background/60 p-3.5 text-sm leading-relaxed text-muted-foreground">
          Not enough specific context to draft something meaningful: {draft.reason}
        </p>
      )}

      {!loading && revealed && draft.canDraft && (
        <div className="animate-fade-in flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-subtle-foreground">{draft.reason}</p>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Subject"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-border-strong focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Draft body"
            rows={8}
            className="resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground transition-colors hover:border-border-strong focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleCopy}>{copied ? "Copied" : "Copy"}</Button>
            {mailtoHref && (
              <Button asChild variant="outline">
                <a href={mailtoHref}>Open in email</a>
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
