-- 0009_placement.sql — Prueba de nivel inicial.
-- Se guarda CADA prueba (historial): permite mostrar "empezaste en A2, hoy estás en B1" y medir resultados reales.
alter table public.profile add column placement_at timestamptz;

create table public.placement_tests (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null check (level in ('A1','A2','B1','B2','C1')),        -- nivel que mostró la prueba
  start_level text not null check (start_level in ('A1','A2','B1','B2','C1')), -- nivel que eligió para empezar
  theta numeric not null,
  skills jsonb not null,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create index on public.placement_tests (user_id, created_at desc);

alter table public.placement_tests enable row level security;

-- El usuario lee y crea SOLO sus pruebas. No puede editarlas ni borrarlas (el historial es confiable).
create policy "own placement read" on public.placement_tests for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own placement insert" on public.placement_tests for insert to authenticated
  with check (user_id = (select auth.uid()));
