-- Per-user rate limiting for the API routes that call paid external APIs
-- (Google Gmail, Anthropic Claude). Each call inserts one row; the app
-- counts rows in a rolling window rather than tracking a counter, since
-- that's simplest to reason about correctly across concurrent requests.
-- Old rows are cheap to keep — this table is small and self-limiting by
-- nature — but can be pruned by a scheduled job later if it grows.
create table public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  route text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_user_route_created_idx
  on public.rate_limit_events (user_id, route, created_at desc);

alter table public.rate_limit_events enable row level security;

-- Users can only see/insert their own events. There's no update/delete
-- policy — rows are append-only from the app's perspective.
create policy "users can manage their own rate limit events" on public.rate_limit_events
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
