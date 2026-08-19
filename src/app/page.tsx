import Link from "next/link";
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12 text-center">
      <div className="animate-fade-in-up flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Radar</h1>
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            See which client relationships are cooling off before they disappear — straight from
            your Gmail, read-only.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <ConnectGmailButton />
          <Link
            href="/demo"
            className="text-sm text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
          >
            Or view a live demo with sample data →
          </Link>
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-border pt-6">
          <p className="text-balance text-xs leading-relaxed text-subtle-foreground">
            Radar only ever reads your Gmail. It never sends, drafts, or modifies anything.
          </p>
          <Link
            href="/privacy"
            className="text-xs text-subtle-foreground underline underline-offset-4 transition-colors hover:text-muted-foreground"
          >
            Privacy
          </Link>
        </div>
      </div>
    </main>
  );
}
