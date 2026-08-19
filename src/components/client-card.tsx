import Link from "next/link";
import { ContractValueInput } from "@/components/contract-value-input";
import { Badge } from "@/components/ui/badge";
import { RISK_META, formatMoney, relativeDays, type RiskTier } from "@/lib/ui/risk";
import { firstIntelligence, type ClientIntelligenceExtraction, type ScoreRow } from "@/lib/types";

// Risk signals first (they justify urgency), then open questions, then
// positive signals — capped at 2 so a card stays scannable in ~2 seconds.
function topSignals(extraction: ClientIntelligenceExtraction): string[] {
  return [
    ...extraction.objections,
    ...extraction.hesitation_signals,
    ...extraction.open_questions,
    ...extraction.buying_signals,
  ].slice(0, 2);
}

export function ClientCard({
  row,
  tier,
  delayMs = 0,
}: {
  row: ScoreRow;
  tier: RiskTier;
  delayMs?: number;
}) {
  const client = row.clients!;
  const meta = RISK_META[tier];
  const lastContactAt =
    client.threads
      .map((t) => t.last_message_at)
      .filter((d): d is string => Boolean(d))
      .sort()
      .pop() ?? null;
  const topReason = row.top_reasons_json?.reasons?.[0] ?? "";
  const suggestedAction = row.top_reasons_json?.suggestedAction;
  const intelligence = firstIntelligence(client.client_intelligence);
  const signals = intelligence?.extraction_json ? topSignals(intelligence.extraction_json) : [];

  return (
    <div
      className={`group animate-fade-in-up relative rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-raised hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_16px_32px_-16px_rgba(0,0,0,0.8)] sm:p-5 ${meta.ring}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {/* Urgency spine — a thin colored edge reads faster than a badge alone. */}
      <span
        aria-hidden
        className={`absolute inset-y-4 left-0 w-0.5 rounded-full opacity-70 transition-opacity duration-300 group-hover:opacity-100 ${meta.dot}`}
      />

      <Link
        href={`/dashboard/clients/${client.id}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label={`View ${client.name}`}
      />

      <div className="pointer-events-none flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-medium leading-snug text-foreground">
              {client.name}
            </p>
            <p className="truncate text-xs text-subtle-foreground">{client.email_domain}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant={meta.badge}>{meta.label}</Badge>
            <span className="text-[0.6875rem] text-subtle-foreground">
              {relativeDays(lastContactAt)}
            </span>
          </div>
        </div>

        {topReason && (
          <p className="text-sm leading-relaxed text-muted-foreground">{topReason}</p>
        )}

        {suggestedAction && (
          <p className={`text-xs font-medium ${meta.text}`}>→ {suggestedAction}</p>
        )}

        {intelligence?.extraction_json?.relevant === false && (
          <p className="text-xs text-attention">
            Flagged as possibly not a real client relationship
          </p>
        )}

        {signals.length > 0 && (
          <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
            {signals.map((s) => (
              <li key={s} className="flex gap-2 text-xs leading-relaxed text-subtle-foreground">
                <span aria-hidden className="text-muted-foreground">
                  ✦
                </span>
                <span className="min-w-0">{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2">
        {/* Tier-matched, not always red — a check-in-tier client showing an
            urgent-red badge next to an amber one reads as mixed signal. */}
        {row.dollar_at_risk ? (
          <Badge variant={meta.badge}>{formatMoney(row.dollar_at_risk)} at risk</Badge>
        ) : (
          <span />
        )}
        <ContractValueInput clientId={client.id} initialValue={client.contract_value} />
      </div>
    </div>
  );
}
