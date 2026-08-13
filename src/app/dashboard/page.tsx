import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { SyncGmailButton } from "@/components/sync-gmail-button";
import { ContractValueInput } from "@/components/contract-value-input";

type TopReasons = { reasons: string[]; suggestedAction: string };

type ScoreRow = {
  health_score: number;
  dollar_at_risk: number | null;
  top_reasons_json: TopReasons | null;
  clients: {
    id: string;
    name: string;
    email_domain: string;
    contract_value: number | null;
    threads: { last_message_at: string | null }[];
  } | null;
};

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  );
}

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const TIERS = [
  { key: "urgent", label: "Needs attention now", dot: "bg-red-400", min: 60, max: 101 },
  { key: "checkin", label: "Worth a check-in", dot: "bg-amber-400", min: 30, max: 60 },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  const gmailConnected = Boolean(tokenRow?.refresh_token);

  const today = new Date().toISOString().slice(0, 10);
  const { data: scoreRows } = await supabase
    .from("scores_daily")
    .select(
      "health_score, dollar_at_risk, top_reasons_json, clients(id, name, email_domain, contract_value, threads(last_message_at))"
    )
    .eq("date", today)
    .order("health_score", { ascending: false });

  const ranked =
    (scoreRows as unknown as ScoreRow[] | null)?.filter((row) => row.clients !== null) ?? [];

  const { count: clientCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  const healthyCount = ranked.filter((r) => r.health_score < 30).length;
  const needsAttention = ranked.filter((r) => r.health_score >= 30);
  const totalAtRisk = needsAttention.reduce((sum, r) => sum + (r.dollar_at_risk ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#0a0e17] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Radar</h1>
          <SignOutButton />
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-400">Signed in as</p>
          <p className="text-lg">{user.email}</p>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                gmailConnected ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {gmailConnected
              ? "Gmail connected (read-only)"
              : "Gmail connection pending — no refresh token stored yet"}
          </div>

          {gmailConnected && (
            <div className="mt-4">
              <SyncGmailButton />
            </div>
          )}
        </div>

        {ranked.length > 0 && (
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-6">
            <div>
              <p className="text-2xl font-semibold">{needsAttention.length}</p>
              <p className="text-xs text-slate-500">
                relationship{needsAttention.length === 1 ? "" : "s"} need attention
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {totalAtRisk > 0 ? formatMoney(totalAtRisk) : "—"}
              </p>
              <p className="text-xs text-slate-500">at risk right now</p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-1 text-sm font-medium text-slate-300">Who needs attention</h2>
          <p className="mb-4 text-xs text-slate-600">
            Newsletters, receipts, and automated mail are filtered out automatically —
            this is only real back-and-forth correspondence.
          </p>

          {ranked.length === 0 ? (
            <p className="text-sm text-slate-500">
              {clientCount && clientCount > 0
                ? "No attention scores for today yet — click Sync Gmail to compute them."
                : "No clients yet — click Sync Gmail to pull threads from the last 60 days and find out who needs a reply."}
            </p>
          ) : needsAttention.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing needs attention right now — every relationship looks healthy.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {TIERS.map((tier) => {
                const rows = needsAttention.filter(
                  (r) => r.health_score >= tier.min && r.health_score < tier.max
                );
                if (rows.length === 0) return null;

                return (
                  <div key={tier.key}>
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {tier.label} ({rows.length})
                    </h3>
                    <ul className="divide-y divide-slate-800">
                      {rows.map((row) => {
                        const client = row.clients!;
                        const lastContactAt =
                          client.threads
                            .map((t) => t.last_message_at)
                            .filter((d): d is string => Boolean(d))
                            .sort()
                            .pop() ?? null;
                        const days = daysSince(lastContactAt);
                        const topReason = row.top_reasons_json?.reasons?.[0] ?? "";
                        const suggestedAction = row.top_reasons_json?.suggestedAction;

                        return (
                          <li key={client.id} className="flex items-start gap-3 py-3">
                            <span
                              className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${tier.dot}`}
                            />
                            <div className="flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="font-medium">{client.name}</span>
                                <span className="text-xs text-slate-500">
                                  {days === null ? "" : days === 0 ? "today" : `${days}d ago`}
                                </span>
                              </div>
                              <p className="text-sm text-slate-400">{topReason}</p>
                              {suggestedAction && (
                                <p className="text-xs text-slate-500">→ {suggestedAction}</p>
                              )}
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <p className="text-xs text-slate-600">{client.email_domain}</p>
                                <div className="flex items-center gap-2">
                                  {row.dollar_at_risk ? (
                                    <span className="rounded bg-red-400/10 px-1.5 py-0.5 text-xs text-red-300">
                                      {formatMoney(row.dollar_at_risk)} at risk
                                    </span>
                                  ) : null}
                                  <ContractValueInput
                                    clientId={client.id}
                                    initialValue={client.contract_value}
                                  />
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              {healthyCount > 0 && (
                <p className="border-t border-slate-800 pt-4 text-xs text-slate-600">
                  {healthyCount} other relationship{healthyCount === 1 ? "" : "s"} look
                  healthy — recently in touch, nothing to act on.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-dashed border-slate-800 p-6 text-sm text-slate-500">
          Coming next: AI-read tone shifts and commitment tracking, the animated
          pulse-line visualization, and the weekly digest email. Not in this MVP:
          invoicing, calendar integration, proposals, notes, multi-user teams, or
          ML-based scoring.
        </div>
      </div>
    </main>
  );
}
