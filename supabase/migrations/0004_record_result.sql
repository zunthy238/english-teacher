-- 0004_record_result.sql — CP-4: guardar el resultado de una lección en una sola operación.
-- security invoker: corre con los permisos del usuario, así que RLS sigue aplicando.
create or replace function public.record_lesson_result(
  p_topic text,
  p_score numeric,
  p_minutes int,
  p_errors jsonb,
  p_first_attempt boolean
)
returns boolean -- true si el tema quedó completado
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_err jsonb;
  v_completed boolean := p_score >= 80;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_score < 0 or p_score > 100 then raise exception 'invalid score'; end if;

  insert into public.sessions (user_id, topic_key, mode, score, minutes)
  values (v_user, p_topic, 'text', p_score, greatest(0, least(p_minutes, 180)));

  -- Los errores se cuentan solo en el primer intento (reintentar no infla el conteo)
  if p_first_attempt then
    for v_err in select e.value from jsonb_array_elements(coalesce(p_errors, '[]'::jsonb)) as e limit 10 loop
      insert into public.errors (user_id, error_type, example_wrong, example_right)
      values (
        v_user,
        left(v_err->>'error_type', 60),
        left(v_err->>'example_wrong', 300),
        left(v_err->>'example_right', 300)
      )
      on conflict (user_id, error_type) do update
        set count = public.errors.count + 1,
            last_seen = now(),
            resolved = false,
            example_wrong = excluded.example_wrong,
            example_right = excluded.example_right;
    end loop;
  end if;

  if v_completed then
    insert into public.user_topic_progress (user_id, topic_key, completed, completed_at)
    values (v_user, p_topic, true, now())
    on conflict (user_id, topic_key) do update
      set completed = true,
          completed_at = coalesce(public.user_topic_progress.completed_at, now());
  end if;

  return v_completed;
end;
$$;

revoke execute on function public.record_lesson_result(text, numeric, int, jsonb, boolean) from public, anon;
grant execute on function public.record_lesson_result(text, numeric, int, jsonb, boolean) to authenticated;
