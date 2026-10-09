-- 0001_init.sql — multiusuario desde el día 1. Todas las tablas llevan user_id.
-- Registro público: DESACTIVADO en Supabase Auth hasta CP-4 (usuarios creados a mano).

create extension if not exists pgcrypto;

create table profile (
  id uuid primary key references auth.users(id) on delete cascade,
  cefr_level text not null default 'A1' check (cefr_level in ('A1','A2','B1','B2','C1')),
  target_exam text not null default 'TOEFL',
  started_at date not null default current_date,
  daily_minutes int not null default 60,
  created_at timestamptz not null default now()
);

-- Curriculum compartido entre usuarios (contenido), progreso por usuario aparte.
create table curriculum (
  id serial primary key,
  cefr_level text not null,
  position int not null,
  topic_key text unique not null,
  title text not null,
  objectives jsonb not null,
  skills text[] not null
);

create table user_topic_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_key text not null references curriculum(topic_key),
  completed boolean not null default false,
  completed_at timestamptz,
  primary key (user_id, topic_key)
);

-- Caché de lecciones compartido (el contenido no es personal); la marca "vista" es por usuario.
create table lessons_cache (
  id serial primary key,
  cache_key text not null,
  kind text not null check (kind in ('lesson','exercise','error_explanation')),
  variant int not null,
  content jsonb not null,
  uses int not null default 0,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  unique (cache_key, kind, variant)
);

create table user_lesson_seen (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id int not null references lessons_cache(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table errors (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  error_type text not null,
  example_wrong text not null,
  example_right text not null,
  count int not null default 1,
  last_seen timestamptz not null default now(),
  resolved boolean not null default false,
  unique (user_id, error_type)
);

create table sessions (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_key text references curriculum(topic_key),
  mode text not null check (mode in ('text','voice','test')),
  score numeric,
  minutes int,
  summary text,
  created_at timestamptz not null default now()
);

create table vocabulary (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  meaning_es text not null,
  example text not null,
  fsrs_card jsonb,
  due_at timestamptz not null default now(),
  unique (user_id, word)
);

-- BYOK: key cifrada con AES-256-GCM en servidor. Nunca se devuelve al cliente.
create table user_api_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai','gemini')),
  ciphertext text not null,
  iv text not null,
  tag text not null,
  key_hint text,            -- últimos 4 caracteres, para mostrar en UI
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  requests int not null default 0,
  voice_seconds int not null default 0,
  primary key (user_id, day)
);

-- Índices
create index on errors (user_id, resolved, count desc);
create index on vocabulary (user_id, due_at);
create index on sessions (user_id, created_at desc);
create index on lessons_cache (cache_key, kind);

-- RLS
alter table profile enable row level security;
alter table curriculum enable row level security;
alter table user_topic_progress enable row level security;
alter table lessons_cache enable row level security;
alter table user_lesson_seen enable row level security;
alter table errors enable row level security;
alter table sessions enable row level security;
alter table vocabulary enable row level security;
alter table user_api_keys enable row level security;
alter table usage_daily enable row level security;

-- Tablas personales: solo el dueño de la fila.
-- Se usa (select auth.uid()) para que Postgres lo evalúe una vez por consulta (mejor rendimiento).
create policy "own profile" on profile for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own progress" on user_topic_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own seen" on user_lesson_seen for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own errors" on errors for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own sessions" on sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own vocabulary" on vocabulary for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own usage" on usage_daily for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- user_api_keys: el cliente NO lee ni escribe. Solo el servidor con la llave secreta (bypassa RLS).
-- Sin políticas = ningún acceso desde anon/authenticated. Intencional.

-- Contenido compartido: lectura para autenticados; escritura solo con la llave secreta.
create policy "read curriculum" on curriculum for select to authenticated using (true);
create policy "read cache" on lessons_cache for select to authenticated using (true);

-- Perfil automático: al crear un usuario en Auth se crea su fila en profile (TOEFL, A1, 60 min).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
