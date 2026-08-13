import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContractValueInput } from "@/components/contract-value-input";
import { RISK_META, formatMoney, relativeDays, riskTier } from "@/lib/ui/risk";
import type { TopReasons } from "@/lib/types";

type ThreadRow = {
  gmail_thread_id: string;
  last_message_at: string | null;
  last_message_direction: "inbound" | "outbound" | null;
  last_message_subject: string | null;
  last_message_snippet: string | null;
};

const MOMENTUM_META = {
  up: { label: "Picking up", icon: "↑", text: "text-emerald-300" },
  down: { label: "Slowing down", icon: "↓", text: "text-amber-300" },
  steady: { label: "Steady", icon: "→", text: "text-slate-300" },
} as const;

const TREND_META = {
  warming: { label: "Replying faster", icon: "↑", text: "text-emerald-300" },
  cooling: { label: "Replying slower", icon: "↓", text: "text-amber-300" },
  steady: { label: "Steady", icon: "→", text: "text-slate-300" },
  unknown: { label: "Not enough history yet", icon: "·", text: "text-slate-500" },
} as const;

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email_domain, contract_value")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const { data: score } = await supabase
    .from("scores_daily")
    .select("health_score, dollar_at_risk, top_reasons_json, date")
    .eq("client_id", id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: threads } = await supabase
    .from("threads")
    .select(
      "gmail_thread_id, last_message_at, last_message_direction, last_message_subject, last_message_snippet"
    )
    .eq("client_id", id)
    .order("last_message_at", { ascending: true });

  const topReasons = score?.top_reasons_json as TopReasons | null;
  const healthScore = score?.health_score ?? 0;
  const tier = riskTier(healthScore);
  const meta = RISK_META[tier];
  const momentum = topReasons?.momentum ? MOMENTUM_META[topReasons.momentum] : null;
  const trend = TREND_META[topReasons?.trend ?? "unknown"];
  const timelineItems = ((threads as ThreadRow[] | null) ?? []).slice(-8);

  return (
    <main className="min-h-screen bg-[#0a0e17] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href="/dashboard" className="w-fit text-xs text-slate-500 hover:text-slate-300">
          ← Back to dashboard
        </Link>

        <div className="animate-fade-in-up rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{client.name}</h1>
              <p className="text-sm text-slate-500">{client.email_domain}</p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badgeBg} ${meta.text}`}
            >
              {meta.emoji} {meta.label}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div>
              <p className="text-3xl font-semibold tabular-nums">{healthScore}</p>
              <p className="text-xs text-slate-500">attention score</p>
            </div>
            {score?.dollar_at_risk ? (
              <div>
                <p className="text-3xl font-semibold tabular-nums text-red-300">
                  {formatMoney(score.dollar_at_risk)}
                </p>
                <p className="text-xs text-slate-500">at risk</p>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <ContractValueInput clientId={client.id} initialValue={client.contract_value} />
          </div>
        </div>

        {!score ? (
          <div className="animate-fade-in-up rounded-lg border border-dashed border-slate-800 p-6 text-sm text-slate-500">
            No scores computed yet — sync Gmail from the dashboard to analyze this
            relationship.
          </div>
        ) : (
          <>
            <div className="grid animate-fade-in-up grid-cols-1 gap-4 sm:grid-cols-2">
              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Communication trend
                </h2>
                <p className={`text-sm font-medium ${trend.text}`}>
                  {trend.icon} {trend.label}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {topReasons?.insights?.[0] ?? "Not enough reply history yet to tell."}
                </p>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Deal momentum
                </h2>
                {momentum ? (
                  <>
                    <p className={`text-sm font-medium ${momentum.text}`}>
                      {momentum.icon} {momentum.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {topReasons?.insights?.find(
                        (s) => s.includes("volume") || s.includes("active back-and-forth") || s.includes("slowed")
                      ) ?? "Message frequency compared to last month."}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Not enough activity yet.</p>
                )}
              </section>
            </div>

            <section className="animate-fade-in-up rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Potential risks
              </h2>
              {topReasons?.reasons?.length ? (
                <ul className="flex flex-col gap-1.5">
                  {topReasons.reasons.map((reason) => (
                    <li key={reason} className="text-sm text-slate-300">
                      • {reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  Sync Gmail again to refresh this client&apos;s analysis.
                </p>
              )}
            </section>

            <section className="animate-fade-in-up rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Suggested next action
                </h2>
                {topReasons?.confidence && (
                  <span className="text-xs text-slate-500">
                    Confidence: <span className="text-slate-300">{topReasons.confidence}</span>
                  </span>
                )}
              </div>
              <p className={`mt-2 text-sm font-medium ${meta.text}`}>
                {topReasons?.suggestedAction ?? "Sync Gmail again to refresh this client's analysis."}
              </p>
              {topReasons?.reasons?.length ? (
                <>
                  <p className="mt-2 text-xs text-slate-600">Why:</p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {topReasons.reasons.map((reason) => (
                      <li key={reason} className="text-xs text-slate-500">
                        • {reason}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>

            <section className="animate-fade-in-up rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                Timeline
              </h2>
              {timelineItems.length === 0 ? (
                <p className="text-sm text-slate-500">No thread history yet.</p>
              ) : (
                <ol className="relative flex flex-col gap-4 border-l border-slate-800 pl-4">
                  {timelineItems.map((t) => (
                    <li key={t.gmail_thread_id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-700" />
                      <p className="text-xs text-slate-500">{relativeDays(t.last_message_at)}</p>
                      <p className="text-sm text-slate-200">
                        {t.last_message_direction === "outbound" ? "📤" : "📥"}{" "}
                        {t.last_message_subject || "(no subject)"}
                      </p>
                      {t.last_message_snippet && (
                        <p className="line-clamp-1 text-xs text-slate-600">
                          {t.last_message_snippet}
                        </p>
                      )}
                    </li>
                  ))}
                  <li className="relative">
                    <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                    <p className="text-xs text-slate-500">now</p>
                    <p className={`text-sm font-medium ${meta.text}`}>
                      → {topReasons?.suggestedAction}
                    </p>
                  </li>
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
