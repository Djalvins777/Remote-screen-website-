-- Create signaling table for WebRTC peer connection
create table if not exists public.signaling (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  sender_type text not null, -- 'sender' or 'viewer'
  message_type text not null, -- 'offer', 'answer', 'ice-candidate'
  payload jsonb not null,
  created_at timestamp with time zone default now()
);

-- Create index for faster lookups
create index if not exists idx_signaling_session on public.signaling(session_id);
create index if not exists idx_signaling_created on public.signaling(created_at);

-- Enable RLS
alter table public.signaling enable row level security;

-- Allow anyone to read signaling messages for active sessions
create policy "signaling_select_any"
  on public.signaling for select
  using (true);

-- Allow anyone to insert signaling messages
create policy "signaling_insert_any"
  on public.signaling for insert
  with check (true);

-- Auto-delete old signaling messages (older than 1 hour)
create or replace function delete_old_signaling()
returns void
language plpgsql
as $$
begin
  delete from public.signaling
  where created_at < now() - interval '1 hour';
end;
$$;
