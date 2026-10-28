-- ============================================================
-- Tests de RLS: cada persona solo accede a lo suyo
--
-- Se ejecutan SOLO contra Supabase local:  supabase test db
-- Todo va dentro de una transacción que se deshace al final
-- (rollback), así que no deja datos en la base.
--
-- Personas de prueba:
--   A     usuaria normal
--   B     otra usuaria normal
--   ADMIN perfiles.es_admin = true
-- ============================================================

begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- ---------- Datos de prueba (como postgres, sin RLS) ----------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local');

insert into perfiles (id, nombre, es_admin) values
  ('00000000-0000-0000-0000-00000000000a', 'A', false),
  ('00000000-0000-0000-0000-00000000000b', 'B', false),
  ('00000000-0000-0000-0000-0000000000ad', 'Admin', true);

insert into fichajes (user_id, fecha, hora_entrada, hora_salida) values
  ('00000000-0000-0000-0000-00000000000a', '2026-10-01', '09:00', '17:00'),
  ('00000000-0000-0000-0000-00000000000b', '2026-10-01', '09:00', '18:00');

insert into horarios_base (user_id, dia_semana, hora_entrada, hora_salida) values
  ('00000000-0000-0000-0000-00000000000a', 1, '09:00', '17:00'),
  ('00000000-0000-0000-0000-00000000000b', 1, '09:00', '18:00');

insert into ajustes_bolsa (user_id, fecha, minutos, es_inicial) values
  ('00000000-0000-0000-0000-00000000000b', '2026-09-01', 600, true);

insert into sugerencias (user_id, prioridad, texto) values
  ('00000000-0000-0000-0000-00000000000b', 'bug', 'Sugerencia de B');

insert into solicitudes_acceso (email) values ('existente@test.local');

-- ============================================================
-- Como A (usuaria normal)
-- ============================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
set local role authenticated;

select is((select count(*)::int from fichajes), 1,
  'A solo ve su propio fichaje');
select is((select count(*)::int from horarios_base where user_id = '00000000-0000-0000-0000-00000000000b'), 0,
  'A no ve el horario base de B');
select is((select count(*)::int from ajustes_bolsa), 0,
  'A no ve la bolsa de B');
select is((select count(*)::int from perfiles), 1,
  'A solo ve su propio perfil');
select is((select count(*)::int from sugerencias), 0,
  'A no ve sugerencias (solo la admin)');

select is_empty(
  $$ update fichajes set nota = 'hackeado' where user_id = '00000000-0000-0000-0000-00000000000b' returning id $$,
  'A no puede modificar fichajes de B');
select is_empty(
  $$ delete from fichajes where user_id = '00000000-0000-0000-0000-00000000000b' returning id $$,
  'A no puede borrar fichajes de B');
select throws_ok(
  $$ insert into fichajes (user_id, fecha) values ('00000000-0000-0000-0000-00000000000b', '2026-10-02') $$,
  '42501', null,
  'A no puede crear fichajes a nombre de B');

select lives_ok(
  $$ update perfiles set es_admin = true where id = '00000000-0000-0000-0000-00000000000a' $$,
  'A puede intentar actualizar su perfil');
select is((select es_admin from perfiles where id = '00000000-0000-0000-0000-00000000000a'), false,
  'A no puede darse permisos de admin (trigger)');

-- ============================================================
-- Como visitante sin sesión (anon)
-- ============================================================
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select lives_ok(
  $$ insert into solicitudes_acceso (email) values ('nueva@test.local') $$,
  'Anon puede pedir acceso desde el login');
select is_empty($$ select id from solicitudes_acceso $$,
  'Anon no puede leer la lista de espera');
select is_empty($$ select id from fichajes $$,
  'Anon no puede leer fichajes');

-- ============================================================
-- Como ADMIN
-- ============================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', true);
set local role authenticated;

-- Solo se cuentan las personas de prueba: la base local puede tener otras usuarias
select is((select count(*)::int from perfiles where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000ad')), 3,
  'La admin ve todos los perfiles');
select is((select count(*)::int from fichajes where user_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000ad')), 2,
  'La admin ve los fichajes de todas');
select is_empty(
  $$ update fichajes set nota = 'cambiado' where user_id = '00000000-0000-0000-0000-00000000000a' returning id $$,
  'La admin no puede modificar fichajes ajenos');

select * from finish();
rollback;
