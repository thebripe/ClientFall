import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { SyncGmailButton } from "@/components/sync-gmail-button";

type ScoreRow = {
  health_score: number;
  top_reasons_json: string[] | null;
  clients: {
    id: string;
    name: string;
    email_domain: string;
    threads: { last_message_at: string | null }[];
  } | null;
};

function urgencyColor(score: number) {
  if (score >= 60) return "bg-red-400";
  if (score >= 30) return "bg-amber-400";
  return "bg-emerald-400";
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  );
}

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
      "health_score, top_reasons_json, clients(id, name, email_domain, threads(last_message_at))"
    )
    .eq("date", today)
    .order("health_score", { ascending: false });

  const ranked = (scoreRows as unknown as ScoreRow[] | null)?.filter(
    (row) => row.clients !== null
  );

  const { count: clientCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

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

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-sm font-medium text-slate-300">
            Who needs attention
          </h2>

          {!ranked || ranked.length === 0 ? (
            <p className="text-sm text-slate-500">
              {clientCount && clientCount > 0
                ? "No attention scores for today yet — click Sync Gmail to compute them."
                : "No clients yet — click Sync Gmail to pull threads from the last 60 days and find out who needs a reply."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {ranked.map((row) => {
                const client = row.clients!;
                const lastContactAt = client.threads
                  .map((t) => t.last_message_at)
                  .filter((d): d is string => Boolean(d))
                  .sort()
                  .pop() ?? null;
                const days = daysSince(lastContactAt);
                const topReason = row.top_reasons_json?.[0] ?? "";

                return (
                  <li key={client.id} className="flex items-start gap-3 py-3">
                    <span
                      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${urgencyColor(
                        row.health_score
                      )}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-xs text-slate-500">
                          {days === null
                            ? ""
                            : days === 0
                            ? "today"
                            : `${days}d ago`}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{topReason}</p>
                      <p className="text-xs text-slate-600">{client.email_domain}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-dashed border-slate-800 p-6 text-sm text-slate-500">
          Coming next: AI-read tone shifts and commitment tracking, a
          dollar-at-risk figure per client, the animated pulse-line
          visualization, and the weekly digest email. Not in this MVP:
          invoicing, calendar integration, proposals, notes, multi-user
          teams, or ML-based scoring.
        </div>
      </div>
    </main>
  );
}
