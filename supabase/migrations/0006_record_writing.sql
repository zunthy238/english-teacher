-- 0006_record_writing.sql — CP-4B: guardar una corrección de escritura (sesión + errores).
-- No marca el tema como completado: eso lo deciden los ejercicios de la lección.
create or replace function public.record_writing_result(p_topic text, p_score numeric, p_errors jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_err jsonb;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_score < 0 or p_score > 100 then raise exception 'invalid score'; end if;

  insert into public.sessions (user_id, topic_key, mode, score, minutes, summary)
  values (v_user, p_topic, 'text', p_score, 0, 'writing');

  for v_err in select e.value from jsonb_array_elements(coalesce(p_errors, '[]'::jsonb)) as e limit 10 loop
    insert into public.errors (user_id, error_type, example_wrong, example_right)
    values (v_user, left(v_err->>'error_type', 60), left(v_err->>'wrong', 300), left(v_err->>'right', 300))
    on conflict (user_id, error_type) do update
      set count = public.errors.count + 1,
          last_seen = now(),
          resolved = false,
          example_wrong = excluded.example_wrong,
          example_right = excluded.example_right;
  end loop;
end;
$$;

revoke execute on function public.record_writing_result(text, numeric, jsonb) from public, anon;
grant execute on function public.record_writing_result(text, numeric, jsonb) to authenticated;
