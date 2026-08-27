import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { DisconnectGmailButton } from "@/components/disconnect-gmail-button";
import { DashboardContent } from "@/components/dashboard-content";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { firstIntelligence, type ScoreRow } from "@/lib/types";

const PRIORITY_THRESHOLD = 30;

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
          "health_score, dollar_at_risk, top_reasons_json, date, clients(id, name, email_domain, contract_value, threads(last_message_at), client_intelligence(analyzed_at, analyzed_through, summary, extraction_json))"
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

  // Priority clients (score >= 30, same threshold as the rest of the app)
  // with no conversation-intelligence analysis yet, or with real thread
  // activity newer than their last analysis.
  const readyToAnalyzeCount = ranked.filter((row) => {
    if (row.health_score < PRIORITY_THRESHOLD) return false;
    const client = row.clients!;
    const latestActivity = client.threads
      .map((t) => t.last_message_at)
      .filter((d): d is string => Boolean(d))
      .sort()
      .pop();
    if (!latestActivity) return false;

    const intel = firstIntelligence(client.client_intelligence);
    if (!intel) return true;
    return new Date(latestActivity) > new Date(intel.analyzed_through);
  }).length;

  return (
    <PageShell>
      <PageHeader title="Clientfall">
        {clientCount && clientCount > 0 ? (
          <Button asChild variant="outline">
            <Link href="/dashboard/chat">Ask Clientfall</Link>
          </Button>
        ) : null}
        {gmailConnected && <DisconnectGmailButton />}
        <SignOutButton />
      </PageHeader>

      <DashboardContent
        userEmail={user.email!}
        firstName={firstName}
        gmailConnected={gmailConnected}
        clientCount={clientCount ?? 0}
        ranked={ranked}
        lastSyncedAt={profileRow?.last_synced_at ?? null}
        reviewedClientCount={reviewedClientCount}
        reviewedThreadCount={reviewedThreadCount}
        readyToAnalyzeCount={readyToAnalyzeCount}
      />

      <p className="rounded-xl border border-dashed border-border p-5 text-xs leading-relaxed text-subtle-foreground">
        Coming next: the animated pulse-line visualization and a weekly digest email. Not in this
        MVP: sending email on your behalf, automatic or scheduled analysis (you choose when Claude
        runs), invoicing, calendar integration, proposals, notes, multi-user teams, or ML-based
        scoring.
      </p>
    </PageShell>
  );
}
