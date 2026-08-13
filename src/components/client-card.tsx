import Link from "next/link";
import { ContractValueInput } from "@/components/contract-value-input";
import { RISK_META, formatMoney, relativeDays, type RiskTier } from "@/lib/ui/risk";
import type { ScoreRow } from "@/lib/types";

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
