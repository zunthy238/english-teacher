-- 0007_exercise_reports.sql — Botón "Reportar este ejercicio".
-- Cada reporte guarda el ejercicio tal como se vio, para revisarlo y corregir el caché o las reglas.
create table public.exercise_reports (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_key text not null,
  variant int,
  prompt_version text,
  exercise_id text not null,
  exercise jsonb not null,
  user_answer text,
  reason text not null check (reason in ('my_answer_valid', 'ambiguous', 'wrong_content', 'other')),
  comment text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'fixed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index on public.exercise_reports (status, created_at desc);

alter table public.exercise_reports enable row level security;

-- Cada usuario crea y ve solo sus reportes; la revisión se hace con la llave secreta o desde el panel.
create policy "insert own reports" on public.exercise_reports for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "read own reports" on public.exercise_reports for select to authenticated
  using (user_id = (select auth.uid()));
