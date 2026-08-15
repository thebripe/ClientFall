export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-[#0a0e17] px-6 py-16 text-slate-300">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Privacy</h1>
        <p className="mt-1 text-sm text-slate-500">How Radar handles your Gmail data.</p>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          What Radar accesses
        </h2>
        <p className="mt-2 text-sm">
          Radar requests the <code className="text-slate-400">gmail.readonly</code> scope from
          Google — read-only access to your mailbox. Radar cannot send email, create drafts, or
          modify or delete anything in your account, on any path, at any point. There is no code
          in this app that calls a Gmail send/draft/modify endpoint.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          What&apos;s stored, and where
        </h2>
        <p className="mt-2 text-sm">
          When you click Sync Gmail, Radar reads message metadata (sender, subject, timestamps,
          a short snippet) from threads in the last 60 days and stores it in a Postgres database
          (Supabase), scoped to your account with row-level security — no other user of this app
          can query your data, and it is never sold or shared with advertisers.
        </p>
        <p className="mt-2 text-sm">
          When you click Analyze conversations or Draft follow-up, Radar additionally fetches the
          full body of the relevant messages from Gmail and sends it to Anthropic&apos;s Claude API
          for that single request. Full message bodies are never written to Radar&apos;s database —
          only the extracted summary (objections, buying signals, open questions, etc.) is stored,
          and it replaces the previous analysis rather than accumulating history.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Third parties involved
        </h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          <li>
            <span className="text-slate-100">Google (Gmail API)</span> — source of the email data
            Radar reads.
          </li>
          <li>
            <span className="text-slate-100">Anthropic (Claude API)</span> — processes message
            content only when you explicitly trigger analysis or drafting, per Anthropic&apos;s own
            API data-use terms.
          </li>
          <li>
            <span className="text-slate-100">Supabase</span> — hosts the database and handles
            sign-in.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Revoking access
        </h2>
        <p className="mt-2 text-sm">
          Click <span className="text-slate-100">Disconnect Gmail</span> on the dashboard at any
          time — this revokes Radar&apos;s access token with Google immediately and deletes it from
          Radar&apos;s database. You can also revoke access directly from your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
            className="text-slate-100 underline underline-offset-2"
          >
            Google Account permissions page
          </a>
          . Disconnecting stops Radar from reading your inbox going forward; previously synced
          client data (names, scores, extracted summaries) stays in your account until you delete
          it or sign out and ask for the account to be removed.
        </p>
      </section>

      <p className="text-xs text-slate-600">
        Questions about your data? Contact the person who shared this app with you.
      </p>
    </main>
  );
}
