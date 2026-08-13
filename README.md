# Radar

Radar connects to a user's Gmail (read-only) and surfaces which client
relationships are at risk of falling apart.

Next.js (App Router) + TypeScript + Tailwind, Supabase for auth + Postgres.
Google OAuth login, Gmail sync + client grouping, a deterministic
attention-scoring engine, and a premium-feeling dashboard (hero insights,
tiered client cards, a per-client detail page with a relationship
timeline) are all working end to end. Not built yet: Claude-based AI
extraction, the animated pulse-line visualization, and the weekly digest
cron.

## 1. Create a Google Cloud project + OAuth client

1. Go to https://console.cloud.google.com/ and create a new project (or
   pick an existing one). Name it whatever you like, e.g. "Radar".
2. **Enable the Gmail API**: in the left sidebar, go to
   *APIs & Services -> Library*, search for "Gmail API", and click
   **Enable**.
3. **Configure the OAuth consent screen**: *APIs & Services -> OAuth
   consent screen*.
   - User type: **External** (unless you have a Google Workspace org and
     want to restrict to it).
   - Fill in app name ("Radar"), your email as support/developer contact.
   - **Scopes**: click *Add or remove scopes* and add
     `https://www.googleapis.com/auth/gmail.readonly`. This is a Google
     "restricted" (sensitive) scope.
   - **Test users**: while the app is in "Testing" publishing status
     (the default), add your own Google account email under *Test users*.
     Only accounts on this list can complete the OAuth flow until you
     submit the app for verification.
   - ⚠️ **Important**: `gmail.readonly` requires Google's app
     verification (and a CASA security assessment) before you can take
     the app out of "Testing" mode and let arbitrary users connect. For
     building and testing solo, "Testing" mode with yourself as a test
     user is enough — just know you'll need to go through Google's
     verification process before a real launch with other users.
4. **Create OAuth client credentials**: *APIs & Services -> Credentials ->
   Create Credentials -> OAuth client ID*.
   - Application type: **Web application**.
   - Name: "Radar (Supabase)".
   - **Authorized redirect URIs**: add your Supabase project's OAuth
     callback URL — you'll get this in step 2 below, it looks like
     `https://<your-project-ref>.supabase.co/auth/v1/callback`. Add it
     here *and* also add `http://localhost:3000/auth/callback` isn't
     needed on the Google side (only the Supabase callback URL goes
     here) — Supabase handles the redirect back to your app itself.
   - Save. You'll get a **Client ID** and **Client Secret** — copy both,
     you'll paste them into Supabase (not into this repo's `.env.local`).

## 2. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. **Get your API keys**: *Project Settings -> API*.
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key -> `SUPABASE_SERVICE_ROLE_KEY` (server-only,
     not used yet, needed later for the cron job)
3. **Enable the Google provider**: *Authentication -> Providers ->
   Google*.
   - Toggle it on.
   - Paste in the **Client ID** and **Client Secret** from step 1.
   - Supabase shows you the **Callback URL** on this same page
     (`https://<your-project-ref>.supabase.co/auth/v1/callback`) — copy
     that into the Google Cloud OAuth client's *Authorized redirect
     URIs* if you haven't already (step 1.4).
   - Save.
4. **Add your local + prod app URLs**: *Authentication -> URL
   Configuration*.
   - Site URL: `http://localhost:3000` for now (change to your Vercel
     URL once deployed, e.g. `https://radar.vercel.app`).
   - Redirect URLs: add `http://localhost:3000/auth/callback` and, once
     deployed, `https://<your-vercel-domain>/auth/callback`.
5. **Run the database schema**: *SQL Editor -> New query*, run these in
   order:
   [`0001_init.sql`](./supabase/migrations/0001_init.sql) ->
   [`0002_clients_unique_domain.sql`](./supabase/migrations/0002_clients_unique_domain.sql) ->
   [`0003_thread_message_summary.sql`](./supabase/migrations/0003_thread_message_summary.sql).
   This creates `users`, `google_tokens`, `clients`, `threads`,
   `ai_extractions`, `scores_daily`, with Row Level Security so each user
   can only see their own data.

## 3. Fill in `.env.local`

```bash
cp .env.local.example .env.local
```

Then fill in:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings -> API -> Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings -> API -> anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings -> API -> service_role key (not used yet) |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Same values pasted into the Supabase Dashboard (step 2.3). Also needed here so the Gmail sync route can refresh its own access token server-side. |
| `ANTHROPIC_API_KEY` | Not used yet — needed for the AI extraction step |
| `RESEND_API_KEY` | Not used yet — needed for the weekly digest email step |

## 4. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Connect Gmail**, sign in with the
Google account you added as a test user, and approve the Gmail
read-only permission. You should land on `/dashboard` showing your email
and a green "Gmail connected (read-only)" indicator.

Once connected, click **Sync Gmail** on the dashboard to pull threads from
the last 60 days, group them into clients by counterparty (company
domain when the sender uses one, exact email address when they're on a
shared consumer webmail domain like gmail.com/yahoo.com/outlook.com —
otherwise two unrelated people on the same provider would get merged
into one "client"), and compute a "who needs attention" score per client
from reply direction, days since last contact, and sudden drop-offs in
activity. Threads are capped at 300 per sync for now — fine for testing,
but a real background job will be needed before this scales to large
mailboxes.

**Filtering out noise**: internal-only threads are skipped, as is any
message carrying a `List-Unsubscribe` or `Precedence: bulk/list` header
— the signal mailbox providers require bulk senders (newsletters,
receipts, shipping updates, admissions blasts, etc.) to include. A
plain no-reply/notifications local-part regex backstops that. This
catches senders a domain blocklist never would (airlines, colleges,
streaming services) without maintaining one. See `isBulkMessage` in
[`src/lib/google/gmail.ts`](./src/lib/google/gmail.ts).

The dashboard leads with a headline (clients needing attention today +
total $ at risk, both animated with a count-up), then the "Who needs
attention" list grouped into urgency tiers with premium-feeling cards
(risk badge, $ opportunity, last contact, recommended action — healthy
relationships collapse to a one-line count so the list stays focused).
Click through any card for a full client detail page: relationship
health, communication trend (are you replying faster or slower than
before), deal momentum (message volume trending up/down), potential
risks, a suggested next action with a confidence level and its
reasoning, and a visual timeline of the relationship.

None of this is AI-generated — it's all deterministic analysis of real
message timing/direction/frequency (see
[`src/lib/scoring/attention.ts`](./src/lib/scoring/attention.ts)). The
"confidence" level is genuinely computed from how much data backs a
given call (more reply history + more signals agreeing = higher), not
a made-up percentage — a fabricated-sounding number felt worse than an
honest label. Same reasoning for not shipping a portfolio-wide
"response rate dropped X% this week" stat yet: that needs real
week-over-week history, which `scores_daily` will accumulate the more
this gets used, but faking it on day one wasn't worth it.

If you land on `/auth/auth-code-error` instead, check:
- The Supabase callback URL is added to the Google OAuth client's
  authorized redirect URIs.
- `http://localhost:3000/auth/callback` is in Supabase's redirect URL
  allowlist.
- Your Google account is listed as a test user on the OAuth consent
  screen (required while the app is in "Testing" status).

## What's next (not built yet)

- Claude-based AI extraction on top threads per client (tone shifts,
  commitments, scope changes)
- The dashboard UI's animated pulse-line visualization (share your
  HTML/CSS/JS prototype and it'll be matched closely)
- The weekly digest cron via Resend
- Out of scope for the MVP entirely: invoicing, calendar integration,
  proposals, notes, multi-user/team features, ML-based scoring

## Known warning

`next build` prints a deprecation notice that the `middleware.ts`
convention is being replaced by `proxy.ts` in a future Next.js major
version. It's fully functional today (session refresh works), just
flagged for a future migration — left as-is for now rather than moving
to an undocumented convention.
