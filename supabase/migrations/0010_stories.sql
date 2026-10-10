-- 0010_stories.sql — Fase C: historias para escuchar en el caché compartido.
-- 1) lessons_cache acepta kind = 'story'.
-- 2) CORRECCIÓN: la unicidad ahora incluye prompt_version. Antes, al cambiar la versión de los prompts,
--    la variante 1 nueva chocaba con la vieja y se volvía a pagar la IA en cada carga.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.lessons_cache'::regclass
      and (contype = 'u' or (contype = 'c' and pg_get_constraintdef(oid) like '%kind%'))
  loop
    execute format('alter table public.lessons_cache drop constraint %I', c);
  end loop;
end $$;

alter table public.lessons_cache
  add constraint lessons_cache_kind_check check (kind in ('lesson', 'exercise', 'error_explanation', 'story'));
alter table public.lessons_cache
  add constraint lessons_cache_key_kind_variant_version_key unique (cache_key, kind, variant, prompt_version);
