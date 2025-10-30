-- Create sessions table for screen sharing rooms
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_code text unique not null,
  device_name text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + interval '24 hours')
);

-- Create index for faster lookups
create index if not exists idx_sessions_code on public.sessions(session_code);
create index if not exists idx_sessions_active on public.sessions(is_active);

-- Enable RLS
alter table public.sessions enable row level security;

-- Allow anyone to read active sessions (needed for viewers to find sessions)
create policy "sessions_select_active"
  on public.sessions for select
  using (is_active = true);

-- Allow anyone to insert sessions (device sharing screen)
create policy "sessions_insert_any"
  on public.sessions for insert
  with check (true);

-- Allow anyone to update sessions (for signaling)
create policy "sessions_update_any"
  on public.sessions for update
  using (true);

-- Allow anyone to delete their sessions
create policy "sessions_delete_any"
  on public.sessions for delete
  using (true);
