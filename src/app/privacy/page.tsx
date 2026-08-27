import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardEyebrow } from "@/components/ui/card";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardEyebrow>{title}</CardEyebrow>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </Card>
  );
}

export default function PrivacyPage() {
  return (
    <PageShell width="narrow">
      <PageHeader title="Privacy" backHref="/" backLabel="Home" />
      <p className="-mt-2 text-sm text-muted-foreground">How Clientfall handles your Gmail data.</p>

      <Section title="What Clientfall accesses">
        <p>
          Clientfall requests the{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">
            gmail.readonly
          </code>{" "}
          scope from Google — read-only access to your mailbox. Clientfall cannot send email, create
          drafts, or modify or delete anything in your account, on any path, at any point. There is
          no code in this app that calls a Gmail send/draft/modify endpoint.
        </p>
      </Section>

      <Section title="What's stored, and where">
        <p>
          When you click Sync Gmail, Clientfall reads message metadata (sender, subject, timestamps, a
          short snippet) from threads in the last 60 days and stores it in a Postgres database
          (Supabase), scoped to your account with row-level security — no other user of this app
          can query your data, and it is never sold or shared with advertisers.
        </p>
        <p>
          When you click Analyze conversations or Draft follow-up, Clientfall additionally fetches the
          full body of the relevant messages from Gmail and sends it to Anthropic&apos;s Claude API
          for that single request. Full message bodies are never written to Clientfall&apos;s database —
          only the extracted summary (objections, buying signals, open questions, etc.) is stored,
          and it replaces the previous analysis rather than accumulating history.
        </p>
      </Section>

      <Section title="Third parties involved">
        <ul className="flex flex-col gap-2">
          <li>
            <span className="font-medium text-foreground">Google (Gmail API)</span> — source of the
            email data Clientfall reads.
          </li>
          <li>
            <span className="font-medium text-foreground">Anthropic (Claude API)</span> — processes
            message content only when you explicitly trigger analysis or drafting, per
            Anthropic&apos;s own API data-use terms.
          </li>
          <li>
            <span className="font-medium text-foreground">Supabase</span> — hosts the database and
            handles sign-in.
          </li>
        </ul>
      </Section>

      <Section title="Revoking access">
        <p>
          Click <span className="font-medium text-foreground">Disconnect Gmail</span> on the
          dashboard at any time — this revokes Clientfall&apos;s access token with Google immediately
          and deletes it from Clientfall&apos;s database. You can also revoke access directly from your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground"
          >
            Google Account permissions page
          </a>
          . Disconnecting stops Clientfall from reading your inbox going forward; previously synced
          client data (names, scores, extracted summaries) stays in your account until you delete
          it or sign out and ask for the account to be removed.
        </p>
      </Section>

      <p className="text-xs text-subtle-foreground">
        Questions about your data? Contact the person who shared this app with you.
      </p>
    </PageShell>
  );
}
