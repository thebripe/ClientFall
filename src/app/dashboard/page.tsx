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

  const [{ data: tokenRow }, { data: profileRow }, { data: scoreRows }, { count: clientCount }] =
    await Promise.all([
      supabase.from("google_tokens").select("refresh_token").eq("user_id", user.id).maybeSingle(),
      supabase.from("users").select("last_synced_at").eq("id", user.id).maybeSingle(),
      supabase
        .from("scores_daily")
        .select(
          "health_score, dollar_at_risk, top_reasons_json, date, clients(id, name, email_domain, contract_value, threads(last_message_at))"
        )
        .order("date", { ascending: false }),
      supabase.from("clients").select("id", { count: "exact", head: true }),
    ]);

  const gmailConnected = Boolean(tokenRow?.refresh_token);

  // Rows come back newest-date-first; keep only the most recent score per
  // client so the dashboard shows real (if slightly stale) data instead of
  // going blank on any day you haven't synced.
  const allRows = (scoreRows as unknown as ScoreRow[] | null)?.filter((r) => r.clients !== null) ?? [];
  const seen = new Set<string>();
  const ranked: ScoreRow[] = [];
  for (const row of allRows) {
    const id = row.clients!.id;
    if (seen.has(id)) continue;
    seen.add(id);
    ranked.push(row);
  }
  ranked.sort((a, b) => b.health_score - a.health_score);

  // Clients actually touched by the most recent sync run specifically
  // (same max date), for the "reviewed since your last sync" count.
  const mostRecentDate = allRows[0]?.date ?? null;
  const reviewedRows = mostRecentDate ? allRows.filter((r) => r.date === mostRecentDate) : [];
  const reviewedClientCount = reviewedRows.length;
  const reviewedThreadCount = reviewedRows.reduce(
    (sum, r) => sum + r.clients!.threads.length,
    0
  );

  const firstName = (user.user_metadata?.full_name || user.user_metadata?.name || "")
    .toString()
    .trim()
    .split(" ")[0] || null;

  return (
    <main className="min-h-screen bg-[#0a0e17] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Radar</h1>
          <SignOutButton />
        </div>

        <DashboardContent
          userEmail={user.email!}
          firstName={firstName}
          gmailConnected={gmailConnected}
          clientCount={clientCount ?? 0}
          ranked={ranked}
          lastSyncedAt={profileRow?.last_synced_at ?? null}
          reviewedClientCount={reviewedClientCount}
          reviewedThreadCount={reviewedThreadCount}
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
