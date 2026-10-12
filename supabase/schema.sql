-- Run once in the Supabase SQL editor.

create table if not exists public.bank_edits (
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null,
  questions jsonb not null default '[]'::jsonb,
  updated_at bigint not null,
  primary key (user_id, mode)
);

create table if not exists public.active_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb,
  updated_at bigint not null default 0
);

create table if not exists public.summaries (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null,
  data jsonb not null,
  completed_at bigint not null,
  primary key (user_id, session_id)
);

alter table public.bank_edits enable row level security;
alter table public.active_sessions enable row level security;
alter table public.summaries enable row level security;

grant select, insert, update, delete on public.bank_edits to authenticated;
grant select, insert, update, delete on public.active_sessions to authenticated;
grant select, insert, update, delete on public.summaries to authenticated;

drop policy if exists "Users manage their bank edits" on public.bank_edits;
create policy "Users manage their bank edits"
on public.bank_edits
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their active session" on public.active_sessions;
create policy "Users manage their active session"
on public.active_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their summaries" on public.summaries;
create policy "Users manage their summaries"
on public.summaries
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.bank_edits replica identity full;
alter table public.active_sessions replica identity full;
alter table public.summaries replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.bank_edits;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.active_sessions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.summaries;
exception
  when duplicate_object then null;
end $$;
