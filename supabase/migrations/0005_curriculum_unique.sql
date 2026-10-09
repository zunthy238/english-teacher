-- 0005_curriculum_unique.sql — CP-4: evita currículos duplicados si llegan 2 peticiones a la vez.
-- Ejecutar DESPUÉS de la limpieza del currículo A1 duplicado.
create unique index if not exists curriculum_level_position_key on public.curriculum (cefr_level, position);
