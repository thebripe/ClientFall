"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DraftResult = {
  canDraft: boolean;
  reason: string;
  subject: string;
  draft: string;
};

/** Shaped like the subject + body it replaces, so nothing jumps on arrival. */
export function DraftSkeleton() {
  return (
    <div className="animate-fade-in flex flex-col gap-2" role="status" aria-live="polite">
      <Skeleton className="h-2.5 w-2/5" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-[8.5rem] w-full rounded-lg" />
      <p className="animate-pulse-soft text-xs text-subtle-foreground">
        Reading the conversation and drafting a reply…
      </p>
    </div>
  );
}

export function DraftFollowUp({
  clientId,
  recipientEmail,
}: {
  clientId: string;
  recipientEmail: string | null;
}) {
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
    ? `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
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
            sent automatically — review and edit before use.
          </p>
        </div>
        <Button onClick={handleDraft} disabled={loading} variant={result ? "outline" : "default"}>
          {loading ? "Drafting…" : result ? "Regenerate" : "Draft follow-up"}
        </Button>
      </div>

      {loading && <DraftSkeleton />}

      {error && <p className="text-xs text-urgent">{error}</p>}

      {!loading && result && !result.canDraft && (
        <p className="animate-fade-in rounded-lg border border-border bg-background/60 p-3.5 text-sm leading-relaxed text-muted-foreground">
          Not enough specific context to draft something meaningful: {result.reason}
        </p>
      )}

      {!loading && result && result.canDraft && (
        <div className="animate-fade-in flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-subtle-foreground">{result.reason}</p>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Subject"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle-foreground/70 hover:border-border-strong focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="Subject"
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
