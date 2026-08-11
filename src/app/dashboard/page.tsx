import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

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
        </div>

        <div className="rounded-lg border border-dashed border-slate-800 p-6 text-sm text-slate-500">
          The risk dashboard (ranked clients, health scores, pulse lines)
          lands here once the signal engine and scoring pipeline are built.
        </div>
      </div>
    </main>
  );
}
