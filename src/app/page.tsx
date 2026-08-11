import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConnectGmailButton } from "@/components/connect-gmail-button";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0e17] px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
          Radar
        </h1>
        <p className="max-w-sm text-sm text-slate-400">
          See which client relationships are cooling off before they
          disappear — straight from your Gmail, read-only.
        </p>
      </div>
      <ConnectGmailButton />
      <p className="max-w-xs text-xs text-slate-500">
        Radar only ever reads your Gmail. It never sends, drafts, or
        modifies anything.
      </p>
    </main>
  );
}
