import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { SyncGmailButton } from "@/components/sync-gmail-button";

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
    .select("refresh_token, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const gmailConnected = Boolean(tokenRow?.refresh_token);

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email_domain, threads(count)")
    .order("name");

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
          <h2 className="mb-3 text-sm font-medium text-slate-300">
            Clients ({clients?.length ?? 0})
          </h2>
          {!clients || clients.length === 0 ? (
            <p className="text-sm text-slate-500">
              No clients yet — run a sync to pull threads from the last 90
              days of Gmail.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {clients.map((client) => (
                <li
                  key={client.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>{client.name}</span>
                  <span className="text-slate-500">
                    {client.email_domain} ·{" "}
                    {(client.threads as { count: number }[])[0]?.count ?? 0}{" "}
                    threads
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-dashed border-slate-800 p-6 text-sm text-slate-500">
          Risk scores, reasoning bullets, and the pulse-line visualization
          land here once the signal engine, AI extraction, and scoring
          pipeline are built.
        </div>
      </div>
    </main>
  );
}
