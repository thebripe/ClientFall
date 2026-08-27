# Clientfall

Clientfall connects to a user's Gmail (read-only) and surfaces which client
relationships are at risk of falling apart.

Next.js (App Router) + TypeScript + Tailwind, Supabase for auth + Postgres.
Google OAuth login, Gmail sync + client grouping, a deterministic
attention-scoring engine, a premium-feeling dashboard (hero insights,
tiered client cards, a per-client detail page with a relationship
timeline), Claude-powered conversation intelligence (objections, buying
signals, open questions, commitments — read on demand, not automatic), a
persistent AI Memory per client, AI-drafted follow-up emails (draft-only,
nothing is ever sent for you), and an "Ask Clientfall" chat for plain-English
questions across all your clients are all working end to end. Not built
yet: the animated pulse-line visualization, the weekly digest cron, and
anything requiring historical outcome data (revenue prediction, close
probability, cross-business benchmarking) — see "What's next" below for
why those are deliberately deferred.

## 1. Create a Google Cloud project + OAuth client

1. Go to https://console.cloud.google.com/ and create a new project (or
   pick an existing one). Name it whatever you like, e.g. "Clientfall".
2. **Enable the Gmail API**: in the left sidebar, go to
   *APIs & Services -> Library*, search for "Gmail API", and click
   **Enable**.
3. **Configure the OAuth consent screen**: *APIs & Services -> OAuth
   consent screen*.
   - User type: **External** (unless you have a Google Workspace org and
     want to restrict to it).
   - Fill in app name ("Clientfall"), your email as support/developer contact.
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
   - Name: "Clientfall (Supabase)".
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
     URL once deployed, e.g. `https://clientfall.vercel.app`).
   - Redirect URLs: add `http://localhost:3000/auth/callback` and, once
     deployed, `https://<your-vercel-domain>/auth/callback`.
5. **Run the database schema**: *SQL Editor -> New query*, run these in
   order:
   [`0001_init.sql`](./supabase/migrations/0001_init.sql) ->
   [`0002_clients_unique_domain.sql`](./supabase/migrations/0002_clients_unique_domain.sql) ->
   [`0003_thread_message_summary.sql`](./supabase/migrations/0003_thread_message_summary.sql) ->
   [`0004_users_last_synced_at.sql`](./supabase/migrations/0004_users_last_synced_at.sql) ->
   [`0005_client_intelligence.sql`](./supabase/migrations/0005_client_intelligence.sql) ->
   [`0006_rate_limits.sql`](./supabase/migrations/0006_rate_limits.sql) ->
   [`0007_client_memory.sql`](./supabase/migrations/0007_client_memory.sql).
   This creates `users`, `google_tokens`, `clients`, `threads`,
   `ai_extractions`, `scores_daily`, `client_intelligence`,
   `rate_limit_events`, `client_memory`, with Row Level Security so each
   user can only see their own data.

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
| `ANTHROPIC_API_KEY` | Required — get one from the [Anthropic Console](https://console.anthropic.com/). Powers "Analyze conversations" and "Draft follow-up" (model: `claude-opus-5`). Without it, those two features return errors; everything else (sync, scoring, dashboard) still works. |
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

The dashboard opens on a morning-briefing hero, not a stats grid: a
greeting, "reviewed N clients across M conversations since your last
sync (X ago)", a single spotlight on whichever client is most urgent
right now with a plain-English reason and a short recommended action
("Reply today", "Follow up", "Check in"), then two smaller counts —
high priority and recommended actions, both reusing the same 60/30
score thresholds as the rest of the app — plus total $ at risk if any
of those clients have a contract value set. Below that, the "Who needs
attention" list groups the same clients into urgency tiers with
premium-feeling cards (risk badge, $ opportunity, last contact,
recommended action — healthy relationships collapse to a one-line
count so the list stays focused). Click through any card for a full
client detail page: relationship health, communication trend (are you
replying faster or slower than before), deal momentum (message volume
trending up/down), potential risks, a suggested next action with a
confidence level and its reasoning, and a visual timeline of the
relationship.

The dashboard shows each client's *most recent* score regardless of
which day it was computed — not just today's — so it never goes blank
just because you haven't synced yet today; it accurately reflects
"since your last sync" instead.

"Reviewed N clients across M conversations" counts clients scored on
the same date as the most recent sync, and sums the thread count on
file for exactly those clients — a real, honest number, though not a
byte-for-byte log of that specific sync run (we don't track
per-sync-run thread history, just per-client latest state). `last_synced_at`
is set at the end of every successful manual sync — still no scheduled/
background sync exists, so the copy always says "since your last sync",
never "overnight" or implies a cron job.

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

### Conversation intelligence (Claude)

Once a client's attention score reaches the "needs attention" threshold
(30+, same threshold used everywhere else in the app), a "ready for
deeper analysis" bar appears on the dashboard with an **Analyze
conversations** button. Clicking it sends that client's most recent
threads (up to 5, full message bodies fetched from Gmail just for this
call — never stored in Postgres) to Claude, which extracts objections,
pricing/budget mentions, buying signals, hesitation/stalling language,
competitor mentions, unanswered open questions, and commitments made by
either side (and whether they were kept), plus a 1-2 sentence summary.
This is stored in `client_intelligence` (one row per client, overwritten
on re-analysis — no history is kept). The top 1-2 signals surface inline
on the client's dashboard card; the full breakdown is on the client
detail page.

This never runs automatically — no cron, no "on every sync." It's
triggered by your click, and a client is only re-analyzed if there's
been real thread activity since the last analysis, so you're not paying
for a re-run that would return the same answer. This is a genuinely AI
step (unlike the scoring engine above) and is labeled as such everywhere
it appears.

### AI-drafted follow-ups

On any client detail page, **Draft follow-up** calls Claude with that
client's real thread history and extracted intelligence (if analyzed)
and asks for a follow-up email that references something actually said
in the conversation — an open question, an objection, a prior
commitment. If there isn't enough real context to write something
specific, it says so instead of generating generic "just checking in"
filler. The draft lands in an editable subject + body you can tweak,
then **Copy** or **Open in email** (a `mailto:` link prefilled with your
edits). There is no send button and no send pipeline in this app —
Clientfall never sends email on your behalf.

### AI Memory

Each analysis run also updates a persistent, accumulating profile per
client — decision maker, budget, current software, competitors, pain
points, goals, communication style, and any dates or commitments that
came up — stored in `client_memory`. Unlike Conversation Intelligence
(which only reflects the threads read in the most recent run), memory
carries forward: each run is asked to merge in what's new rather than
replace the whole thing, so a fact doesn't disappear just because it
wasn't repeated in the latest email. It's built from the same Claude
call as Conversation Intelligence (same button, same cost, no extra API
calls), and shown on the client detail page under **AI Memory**, with an
empty state until a client's first analysis.

### AI Chat ("Ask Clientfall")

A chat page (`/dashboard/chat`) for asking plain-English questions about
your clients — "which client should I prioritize," "who mentioned
pricing," "which clients haven't heard from me in a while." Each request
sends Claude a compact summary of every client's score, reasons,
conversation intelligence, and memory, and asks it to answer using only
that real data — it says so directly if the data doesn't support an
answer, rather than guessing. Client names in the answer become clickable
chips linking straight to that client's detail page. Rate-limited like
the other Claude-calling routes (20 messages/hour) since it's a paid API
call per message.

If you land on `/auth/auth-code-error` instead, check:
- The Supabase callback URL is added to the Google OAuth client's
  authorized redirect URIs.
- `http://localhost:3000/auth/callback` is in Supabase's redirect URL
  allowlist.
- Your Google account is listed as a test user on the OAuth consent
  screen (required while the app is in "Testing" status).

## Sharing this publicly

Clientfall is hardened for public exposure (security headers, per-user rate
limiting on the Gmail/Claude-calling routes, generic error responses, a
privacy page, and an in-app "Disconnect Gmail" action), but there are two
genuinely different ways to "make it public," and Google's rules force the
split:

**Send the `/demo` link to anyone.** `https://<your-domain>/demo` is a
fully public, unauthenticated route with realistic hand-written sample
data — no Gmail connection, no Google consent screen, no real API calls
(Anthropic/Google/Supabase), zero cost, zero risk. This is the right link
for a broad share or anyone who's just evaluating the idea.

**Give a specific person the real app.** `gmail.readonly` is a Google
*restricted scope*. Until you complete Google's app verification (weeks,
plus a paid CASA security assessment for restricted scopes), your OAuth
consent screen stays in **Testing** mode: only accounts you've manually
added as test users (Google Cloud Console -> APIs & Services -> OAuth
consent screen -> Test users, max 100) can complete sign-in — everyone
else hits an "app hasn't been verified" block. So before sending the real
`/` link to someone important, add their Google account as a test user
first.

### Deploying to Vercel

1. `vercel` (or connect the repo at vercel.com) and deploy.
2. In the Vercel project's Environment Variables settings, set every
   variable from `.env.local.example` (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
   `ANTHROPIC_API_KEY`) — use fresh values, not anything that was ever
   pasted into a chat or committed anywhere.
3. Add your production domain to two places that still point at
   `localhost` from local dev:
   - **Supabase** -> Authentication -> URL Configuration: add
     `https://<your-domain>/auth/callback` to Redirect URLs, and update
     Site URL.
   - **Google Cloud Console** -> your OAuth client: the Supabase callback
     URL doesn't change (it's still `https://<project-ref>.supabase.co/auth/v1/callback`),
     so nothing to add there for a Vercel deploy specifically.
4. Add the important person's Google account under **Test users** on the
   OAuth consent screen (step above) before sending them the link, or
   they'll bounce off Google's verification wall.

## What's next (not built yet)

- The dashboard UI's animated pulse-line visualization (share your
  HTML/CSS/JS prototype and it'll be matched closely)
- The weekly digest cron via Resend
- Tone-shift detection across a relationship's full history (today's
  conversation intelligence looks at the 5 most recent threads, not the
  whole relationship)
- Out of scope for the MVP entirely: sending email on your behalf,
  scheduled/automatic AI analysis, invoicing, calendar integration,
  proposals, notes, multi-user/team features, ML-based scoring

**Deliberately deferred, not forgotten** — revenue prediction, close
probability, "deals likely to close this month," and cross-business
benchmarking ("you follow up slower than similar businesses") all need
real historical outcome data (won/lost deals) or a cross-tenant dataset
that doesn't exist yet — this is currently a single-user app with no
concept of a deal's outcome, only reply timing. Building these now would
mean either fabricating numbers or a large benchmarking pipeline neither
of which serves the product's core trust bet: every number shown is
real, or it isn't shown. Once there's enough real usage history, these
become honestly buildable — not before.

## Known warning

`next build` prints a deprecation notice that the `middleware.ts`
convention is being replaced by `proxy.ts` in a future Next.js major
version. It's fully functional today (session refresh works), just
flagged for a future migration — left as-is for now rather than moving
to an undocumented convention.
Testing auto-deploy.
