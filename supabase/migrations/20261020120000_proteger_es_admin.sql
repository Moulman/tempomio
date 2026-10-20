-- ============================================================
-- Impide que un usuario se dé permisos de admin a sí mismo.
--
-- La policy "perfiles_update_own" deja a cada usuario actualizar su fila
-- de perfiles entera, incluida la columna es_admin. Con este trigger, para
-- peticiones de la app (rol authenticated o anon) es_admin se fuerza a
-- false al crear el perfil y no cambia al actualizarlo. Desde el panel de
-- Supabase (SQL Editor, Table Editor) se puede seguir cambiando.
--
-- No borra ni modifica datos: solo crea una función y un trigger.
-- Se puede ejecutar más de una vez.
-- ============================================================

create or replace function proteger_es_admin()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.es_admin := false;
    else
      new.es_admin := old.es_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_perfiles_proteger_es_admin on perfiles;
create trigger trg_perfiles_proteger_es_admin
  before insert or update on perfiles
  for each row execute function proteger_es_admin();
