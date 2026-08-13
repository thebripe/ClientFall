-- Last-message summary per thread, captured at sync time. Lets the
-- attention-scoring pass (and the dashboard) know who spoke last and
-- what about, without re-fetching Gmail.
alter table public.threads
  add column if not exists last_message_direction text
    check (last_message_direction in ('inbound', 'outbound')),
  add column if not exists last_message_from text,
  add column if not exists last_message_subject text,
  add column if not exists last_message_snippet text;
