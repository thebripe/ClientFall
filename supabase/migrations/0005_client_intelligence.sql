-- Conversation intelligence: one row per client, holding the Claude-extracted
-- read of their recent thread content (objections, buying signals, open
-- questions, commitments, etc). Overwritten on each re-analysis rather than
-- kept as history — the raw model output is preserved for the current
-- analysis only, not across every past run.
create table public.client_intelligence (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  analyzed_at timestamptz not null default now(),
  -- Latest thread activity (max last_message_at) included in this analysis.
  -- Compared against current thread state to decide if a re-analysis is due.
  analyzed_through timestamptz not null,
  model text not null,
  summary text,
  extraction_json jsonb not null,
  raw_model_output_json jsonb not null,
  unique (client_id)
);

alter table public.client_intelligence enable row level security;

create policy "users can manage their own client intelligence" on public.client_intelligence
  for all using (
    exists (
      select 1 from public.clients
      where clients.id = client_intelligence.client_id
        and clients.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients
      where clients.id = client_intelligence.client_id
        and clients.user_id = auth.uid()
    )
  );
