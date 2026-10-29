-- ============================================================
-- Lista de espera (solicitudes_acceso): el admin se decide con es_admin()
--
-- En producción las policies de lectura y actualización se crearon a
-- mano con el id del admin escrito en la condición:
--   solicitudes_select_admin / solicitudes_update_admin
--     using (auth.uid() = '<id fijo>')
-- y la de inserción se llamaba solicitudes_insert_public.
--
-- Esta migración las sustituye por las mismas policies que el resto de
-- tablas y que prueban los tests de RLS (supabase/tests/database):
--   - cualquiera, con sesión o sin ella, puede apuntarse;
--   - solo quien tiene perfiles.es_admin = true puede leer y aprobar.
--
-- Todo va en un único bloque DO: si algo falla, no cambia nada.
-- No borra ni modifica datos. Se puede ejecutar más de una vez.
-- ============================================================

do $$
begin
  -- es_admin() tiene que existir y ser SECURITY DEFINER
  -- (la crea 20261020130000_perfiles_lectura_admin.sql)
  if not exists (
    select 1 from pg_proc
    where proname = 'es_admin'
      and pronamespace = 'public'::regnamespace
      and pronargs = 0
      and prosecdef
  ) then
    raise exception 'Falta es_admin() SECURITY DEFINER: aplica antes 20261020130000_perfiles_lectura_admin.sql. No se ha cambiado nada.';
  end if;

  -- Policies antiguas creadas a mano (admin por id fijo)
  drop policy if exists "solicitudes_insert_public" on solicitudes_acceso;
  drop policy if exists "solicitudes_select_admin" on solicitudes_acceso;
  drop policy if exists "solicitudes_update_admin" on solicitudes_acceso;

  -- Policies definitivas (mismos nombres que en schema.sql)
  drop policy if exists "solicitudes_acceso_insert_public" on solicitudes_acceso;
  create policy "solicitudes_acceso_insert_public" on solicitudes_acceso
    for insert to anon, authenticated with check (true);

  drop policy if exists "solicitudes_acceso_select_admin" on solicitudes_acceso;
  create policy "solicitudes_acceso_select_admin" on solicitudes_acceso
    for select using (es_admin());

  drop policy if exists "solicitudes_acceso_update_admin" on solicitudes_acceso;
  create policy "solicitudes_acceso_update_admin" on solicitudes_acceso
    for update using (es_admin());
end;
$$;
