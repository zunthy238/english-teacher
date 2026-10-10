-- scripts/reset-user.sql — REINICIA el avance de UN usuario (no borra su cuenta ni su API key).
-- Uso: cambia el correo de la línea "v_email" y ejecuta todo en Supabase → SQL Editor.
-- Borra: temas completados, sesiones, errores, lecciones vistas, vocabulario, tarjetas de repaso, pruebas de nivel
-- y uso del día. Lo deja en A1 y SIN prueba de nivel (al entrar, la app le pedirá hacerla).
-- IMPORTANTE: no guardes (commit) este archivo con un correo real.
do $$
declare
  v_email text := 'CORREO-DEL-USUARIO@ejemplo.com';
  v_user uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No existe un usuario con el correo %', v_email;
  end if;

  delete from public.user_topic_progress where user_id = v_user;
  delete from public.sessions where user_id = v_user;
  delete from public.errors where user_id = v_user;
  delete from public.user_lesson_seen where user_id = v_user;
  delete from public.vocabulary where user_id = v_user;
  delete from public.usage_daily where user_id = v_user;
  delete from public.review_cards where user_id = v_user;
  delete from public.placement_tests where user_id = v_user;
  update public.profile set cefr_level = 'A1', placement_at = null where id = v_user;

  raise notice 'Avance reiniciado para %', v_email;
end $$;
