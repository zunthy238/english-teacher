-- 0003_lesson_uses.sql — CP-3: contador de usos del caché de lecciones (métrica de ahorro).
create or replace function public.increment_lesson_uses(p_lesson int)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.lessons_cache set uses = uses + 1 where id = p_lesson;
$$;

revoke execute on function public.increment_lesson_uses(int) from public, anon, authenticated;
grant execute on function public.increment_lesson_uses(int) to service_role;
