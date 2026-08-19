export type RiskTier = "urgent" | "checkin" | "healthy";

export function riskTier(score: number): RiskTier {
  if (score >= 60) return "urgent";
  if (score >= 30) return "checkin";
  return "healthy";
}

/**
 * The urgency scale is the only place chroma appears in the UI — every
 * other surface is warm-neutral ink. That's deliberate: if color only
 * ever means "how much attention does this need", a glance at the page
 * reads as signal rather than decoration.
 *
 * `badge` maps onto the Badge component's variants; `dot`/`text`/`accent`
 * are for the places a full badge would be too heavy.
 */
export const RISK_META: Record<
  RiskTier,
  {
    label: string;
    badge: "urgent" | "attention" | "healthy";
    dot: string;
    text: string;
    surface: string;
    border: string;
    ring: string;
  }
> = {
  urgent: {
    label: "High risk",
    badge: "urgent",
    dot: "bg-urgent",
    text: "text-urgent",
    surface: "bg-urgent-surface",
    border: "border-urgent-border",
    ring: "hover:border-urgent-border",
  },
  checkin: {
    label: "Needs a check-in",
    badge: "attention",
    dot: "bg-attention",
    text: "text-attention",
    surface: "bg-attention-surface",
    border: "border-attention-border",
    ring: "hover:border-attention-border",
  },
  healthy: {
    label: "Healthy",
    badge: "healthy",
    dot: "bg-healthy",
    text: "text-healthy",
    surface: "bg-healthy-surface",
    border: "border-healthy-border",
    ring: "hover:border-healthy-border",
  },
};

export function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
}

export function relativeDays(dateStr: string | null): string {
  const days = daysSince(dateStr);
  if (days === null) return "";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
