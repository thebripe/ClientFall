-- Radar core schema.
-- Run this in the Supabase SQL Editor (or via `supabase db push` once the
-- CLI is linked to your project) before testing the Connect Gmail flow.

-- users mirrors auth.users (1:1, same id) so app tables can foreign-key
-- against a table we own instead of the auth schema directly.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- Google OAuth tokens captured on Connect Gmail. Kept separate from
-- `users` since it's auth infrastructure, not app data, and holds a
-- refresh token that later backend jobs (e.g. the weekly digest cron)
-- use to read Gmail without the user present.
create table if not exists public.google_tokens (
  user_id uuid primary key references public.users (id) on delete cascade,
  access_token text,
  refresh_token text,
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  email_domain text not null,
  contract_value numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  gmail_thread_id text not null,
  last_message_at timestamptz,
  message_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (client_id, gmail_thread_id)
);

create table if not exists public.ai_extractions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  extracted_at timestamptz not null default now(),
  raw_model_output_json jsonb not null
);

create table if not exists public.scores_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  health_score numeric not null,
  dollar_at_risk numeric,
  top_reasons_json jsonb,
  unique (client_id, date)
);

-- Row Level Security: every table is scoped to the signed-in user, either
-- directly (users, google_tokens, clients) or by walking the foreign key
-- up to clients.user_id (threads, ai_extractions, scores_daily).

alter table public.users enable row level security;
alter table public.google_tokens enable row level security;
alter table public.clients enable row level security;
alter table public.threads enable row level security;
alter table public.ai_extractions enable row level security;
alter table public.scores_daily enable row level security;

create policy "users can manage their own row" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "users can manage their own google tokens" on public.google_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can manage their own clients" on public.clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can manage their own threads" on public.threads
  for all using (
    exists (
      select 1 from public.clients
      where clients.id = threads.client_id
        and clients.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients
      where clients.id = threads.client_id
        and clients.user_id = auth.uid()
    )
  );

create policy "users can manage their own ai extractions" on public.ai_extractions
  for all using (
    exists (
      select 1 from public.threads
      join public.clients on clients.id = threads.client_id
      where threads.id = ai_extractions.thread_id
        and clients.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.threads
      join public.clients on clients.id = threads.client_id
      where threads.id = ai_extractions.thread_id
        and clients.user_id = auth.uid()
    )
  );

create policy "users can manage their own scores" on public.scores_daily
  for all using (
    exists (
      select 1 from public.clients
      where clients.id = scores_daily.client_id
        and clients.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients
      where clients.id = scores_daily.client_id
        and clients.user_id = auth.uid()
    )
  );
