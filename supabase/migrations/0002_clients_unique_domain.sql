-- One client row per (user, counterparty domain) so the Gmail sync can
-- upsert clients idempotently instead of creating duplicates on every run.
alter table public.clients
  add constraint clients_user_domain_unique unique (user_id, email_domain);
