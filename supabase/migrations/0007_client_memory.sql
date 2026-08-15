-- Persistent, accumulating per-client memory (decision maker, budget,
-- competitors, pain points, goals, communication style, commitments,
-- personal notes). Unlike client_intelligence — which reflects only the
-- threads read in the most recent analysis run — this is meant to carry
-- forward: each analysis run is asked to update it, not replace it.
-- One row per client, upserted in place; RLS mirrors client_intelligence.
create table public.client_memory (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  updated_at timestamptz not null default now(),
  memory_json jsonb not null default '{}'::jsonb,
  unique (client_id)
);

alter table public.client_memory enable row level security;

create policy "users can manage their own client memory" on public.client_memory
  for all using (
    exists (select 1 from public.clients where clients.id = client_memory.client_id and clients.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.clients where clients.id = client_memory.client_id and clients.user_id = auth.uid())
  );
