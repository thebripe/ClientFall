export type RiskTier = "urgent" | "checkin" | "healthy";

export function riskTier(score: number): RiskTier {
  if (score >= 60) return "urgent";
  if (score >= 30) return "checkin";
  return "healthy";
}

export const RISK_META: Record<
  RiskTier,
  { label: string; emoji: string; dot: string; text: string; badgeBg: string; border: string }
> = {
  urgent: {
    label: "High risk",
    emoji: "🔴",
    dot: "bg-red-400",
    text: "text-red-300",
    badgeBg: "bg-red-400/10",
    border: "hover:border-red-900/60",
  },
  checkin: {
    label: "Needs a check-in",
    emoji: "🟠",
    dot: "bg-amber-400",
    text: "text-amber-300",
    badgeBg: "bg-amber-400/10",
    border: "hover:border-amber-900/60",
  },
  healthy: {
    label: "Healthy",
    emoji: "🟢",
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    badgeBg: "bg-emerald-400/10",
    border: "hover:border-emerald-900/60",
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
