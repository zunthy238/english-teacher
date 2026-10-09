-- LIMPIEZA ÚNICA (no es una migración): borra el currículo A1 duplicado y sus lecciones.
-- Conserva tus minutos y tus errores; se pierde solo el "tema completado" de hoy.
begin;
update public.sessions set topic_key = null where topic_key like 'A1\_%';
delete from public.user_topic_progress where topic_key like 'A1\_%';
delete from public.lessons_cache where cache_key like 'A1\_%';
delete from public.curriculum where cefr_level = 'A1';
commit;
