-- ============================================================
-- El admin puede leer todos los perfiles (panel de Admin: lista de
-- usuarias y nombres en Sugerencias).
--
-- En producción la única policy de lectura de perfiles era
-- "perfiles_select_own" (auth.uid() = id), así que el admin solo se veía
-- a sí mismo. Esta migración añade una policy aparte, sin tocar la
-- existente: las policies de lectura se suman (basta con cumplir una).
--
-- La policy usa es_admin(), que lee perfiles. Para no entrar en bucle la
-- función tiene que ser SECURITY DEFINER:
--   - si no existe, se crea así;
--   - si existe pero no lo es, la migración se para sin cambiar nada.
--
-- No borra ni modifica datos. Se puede ejecutar más de una vez.
-- ============================================================

do $$
declare
  existe boolean;
  definer boolean;
begin
  select true, p.prosecdef into existe, definer
  from pg_proc p
  where p.proname = 'es_admin'
    and p.pronamespace = 'public'::regnamespace
    and p.pronargs = 0;

  if existe is null then
    execute $f$
      create function public.es_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as 'select exists (select 1 from perfiles where id = auth.uid() and es_admin)'
    $f$;
  elsif not definer then
    raise exception 'es_admin() existe pero no es SECURITY DEFINER: usarla en una policy de perfiles provocaría recursión. No se ha cambiado nada.';
  end if;

  -- Dentro del mismo bloque: si algo falla arriba, la policy no llega a crearse
  drop policy if exists "perfiles_select_admin" on perfiles;
  create policy "perfiles_select_admin" on perfiles
    for select using (es_admin());
end;
$$;
