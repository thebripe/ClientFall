import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for page chrome. Every screen previously
 * hardcoded its own background, max-width and padding, which is why they
 * drifted apart visually — route everything through here instead.
 */
export function PageShell({
  children,
  className,
  width = "default",
}: {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "narrow" | "full";
}) {
  return (
    <main className="min-h-screen w-full bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-6 sm:gap-8",
          width === "narrow" && "max-w-xl",
          width === "default" && "max-w-3xl",
          width === "full" && "max-w-5xl",
          className
        )}
      >
        {children}
      </div>
    </main>
  );
}

/** Top bar: wordmark or back-link on the left, actions on the right. */
export function PageHeader({
  title,
  tag,
  backHref,
  backLabel = "Back",
  children,
}: {
  title?: React.ReactNode;
  tag?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden>←</span>
            {backLabel}
          </Link>
        ) : null}
        {title ? (
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        ) : null}
        {tag ? (
          <span className="rounded-full border border-attention-border bg-attention-surface px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-attention">
            {tag}
          </span>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

/** Amber notice strip used to mark the public sample-data demo. */
export function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in rounded-lg border border-attention-border bg-attention-surface px-4 py-3 text-xs leading-relaxed text-attention">
      {children}
    </div>
  );
}
