import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { DashboardContent } from "@/components/dashboard-content";
import type { ScoreRow } from "@/lib/types";

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

  return (
    <main className="min-h-screen bg-[#0a0e17] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Radar</h1>
          <SignOutButton />
        </div>

        <DashboardContent
          userEmail={user.email!}
          gmailConnected={gmailConnected}
          clientCount={clientCount ?? 0}
          ranked={ranked}
        />

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
