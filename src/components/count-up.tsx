"use client";

import { useEffect, useRef, useState } from "react";

// Animates a number counting up on mount. Purely cosmetic — the final
// value is always the real, already-computed number passed in.
export function CountUp({
  value,
  durationMs = 700,
  formatter,
}: {
  value: number;
  durationMs?: number;
  formatter?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveDuration = reducedMotion ? 0 : durationMs;

    startRef.current = null;
    let frame: number;

    function step(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp;
      const progress =
        effectiveDuration <= 0 ? 1 : Math.min(1, (timestamp - startRef.current) / effectiveDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <>{formatter ? formatter(display) : display}</>;
}
