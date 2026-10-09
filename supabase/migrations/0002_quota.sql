-- 0002_quota.sql — CP-2: cuota diaria atómica y cierre de usage_daily al navegador.

-- 1. Seguridad: con la política "for all", un usuario podía reiniciar su propio contador
--    desde el navegador y saltarse la cuota. Ahora solo puede LEER su uso; escribe el servidor.
drop policy if exists "own usage" on public.usage_daily;
create policy "read own usage" on public.usage_daily for select to authenticated
  using (user_id = (select auth.uid()));

-- 2. Consumo atómico: suma 1 solo si no se ha llegado al límite.
--    Devuelve el uso nuevo, o NULL si el límite ya se alcanzó.
--    El "día" se cuenta en hora de Colombia (se reinicia a medianoche de Bogotá).
create or replace function public.consume_request(p_user uuid, p_limit int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'America/Bogota')::date;
  v_used int;
begin
  insert into public.usage_daily (user_id, day, requests)
  values (p_user, v_day, 1)
  on conflict (user_id, day) do update
    set requests = public.usage_daily.requests + 1
    where public.usage_daily.requests < p_limit
  returning requests into v_used;
  return v_used;
end;
$$;

-- Solo el servidor (llave secreta) puede llamarla; nunca el navegador.
revoke execute on function public.consume_request(uuid, int) from public, anon, authenticated;
grant execute on function public.consume_request(uuid, int) to service_role;
