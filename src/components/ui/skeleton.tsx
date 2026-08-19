import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shimmering placeholder for content that is genuinely loading. Prefer
 * this over a bare spinner so the layout doesn't jump when real content
 * arrives — the skeleton should roughly match the shape it replaces.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-shimmer rounded-md bg-secondary/60", className)}
      {...props}
    />
  );
}

/** A few stacked lines, for paragraph-shaped loading content. */
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText };
