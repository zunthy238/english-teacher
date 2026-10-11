-- 0012_chat_state.sql — Mike Chat: dónde va cada usuario en la conversación de cada tema (para retomarla).
create table public.chat_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_key text not null,
  variant int not null,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_key, variant)
);

alter table public.chat_state enable row level security;

-- Cada usuario ve y guarda solo sus conversaciones.
create policy "own chat state" on public.chat_state for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
