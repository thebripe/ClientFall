import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12 text-center">
      <div className="animate-fade-in-up flex w-full max-w-sm flex-col items-center gap-5">
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-full border border-urgent-border bg-urgent-surface text-urgent"
        >
          !
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Couldn&apos;t connect Gmail
          </h1>
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            Something went wrong finishing the Google sign-in. This is usually a misconfigured
            redirect URI or OAuth client. Check the server logs and try again.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/">Back to login</Link>
        </Button>
      </div>
    </main>
  );
}
