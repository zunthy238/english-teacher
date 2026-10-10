-- 0011_speaking.sql — Fase D: para qué quiere el inglés cada usuario + resultado de conversaciones por voz.
alter table public.profile
  add column goals text[] not null default '{daily}'
    check (goals <@ array['daily', 'travel', 'work', 'study']::text[] and cardinality(goals) between 1 and 4),
  add column job_title text check (job_title is null or char_length(job_title) between 2 and 60);

-- Guarda una conversación: sesión de voz (cuenta para la meta diaria) + errores (alimentan repaso y lecciones).
-- security invoker: corre con los permisos del usuario, RLS sigue aplicando.
create or replace function public.record_speaking_result(p_minutes int, p_score numeric, p_summary text, p_errors jsonb)
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
  values (v_user, null, 'voice', p_score, greatest(0, least(p_minutes, 60)), left(p_summary, 120));

  for v_err in select e.value from jsonb_array_elements(coalesce(p_errors, '[]'::jsonb)) as e limit 5 loop
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

revoke execute on function public.record_speaking_result(int, numeric, text, jsonb) from public, anon;
grant execute on function public.record_speaking_result(int, numeric, text, jsonb) to authenticated;
