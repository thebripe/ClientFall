-- Records when the user last ran a manual Gmail sync, so the morning
-- briefing can honestly say "since your last sync (2 hours ago)"
-- instead of just a date. Manual-trigger only — does not imply any
-- scheduled/background sync.
alter table public.users
  add column if not exists last_synced_at timestamptz;
