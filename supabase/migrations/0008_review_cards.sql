-- 0008_review_cards.sql — Fase B: repaso espaciado (FSRS).
-- Cada frase, palabra y error aprendido es una tarjeta con su próxima fecha de repaso.
create table public.review_cards (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('vocab', 'phrase', 'error')),
  front text not null,            -- lo que se muestra (inglés)
  back text not null,             -- la respuesta (significado o explicación)
  extra text,                     -- ejemplo o error típico
  error_type text,                -- solo kind = 'error': enlaza con la tabla errors
  topic_key text,
  fsrs jsonb not null,            -- estado del algoritmo (ts-fsrs)
  due_at timestamptz not null,
  reps int not null default 0,
  lapses int not null default 0,
  last_review timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, kind, front)
);

create index on public.review_cards (user_id, due_at);

alter table public.review_cards enable row level security;

-- Cada usuario gestiona solo sus tarjetas.
create policy "own review cards" on public.review_cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
