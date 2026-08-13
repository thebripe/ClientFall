import Link from "next/link";
import { ContractValueInput } from "@/components/contract-value-input";
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
      className={`group relative animate-fade-in-up cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-lg hover:shadow-black/30 ${meta.border}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <Link href={`/dashboard/clients/${client.id}`} className="absolute inset-0" aria-label={`View ${client.name}`} />

      <div className="pointer-events-none flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badgeBg} ${meta.text}`}
          >
            {meta.emoji} {meta.label}
          </span>
          <span className="text-xs text-slate-500">{relativeDays(lastContactAt)}</span>
        </div>

        <div>
          <p className="font-medium text-slate-100">{client.name}</p>
          <p className="text-xs text-slate-600">{client.email_domain}</p>
        </div>

        <p className="text-sm text-slate-400">{topReason}</p>
        {suggestedAction && (
          <p className={`text-xs font-medium ${meta.text}`}>→ {suggestedAction}</p>
        )}

        {intelligence?.extraction_json?.relevant === false && (
          <p className="text-xs text-amber-400">
            ⚠ AI flagged this as possibly not a real client relationship
          </p>
        )}
        {signals.length > 0 && (
          <ul className="mt-0.5 flex flex-col gap-0.5 border-t border-slate-800/60 pt-1.5">
            {signals.map((s) => (
              <li key={s} className="text-xs text-slate-500">
                ✦ {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
        {row.dollar_at_risk ? (
          <span className="rounded bg-red-400/10 px-1.5 py-0.5 text-xs text-red-300">
            {formatMoney(row.dollar_at_risk)} at risk
          </span>
        ) : (
          <span />
        )}
        <ContractValueInput clientId={client.id} initialValue={client.contract_value} />
      </div>
    </div>
  );
}
