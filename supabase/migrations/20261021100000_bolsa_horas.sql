-- ============================================================
-- Bolsa de horas
--
-- 1. fichajes.bolsa_minutos: horas de la bolsa usadas ese día (salir
--    antes o día libre). Va en fichajes porque hay un registro por día;
--    hereda sus policies (cada usuario solo lo suyo).
-- 2. ajustes_bolsa: saldo inicial (con fecha desde la que se cuentan los
--    fichajes) y correcciones a mano, con motivo.
--
-- No borra ni modifica datos existentes: solo añade una columna vacía y
-- una tabla nueva. Se puede ejecutar más de una vez.
-- ============================================================

-- ---------- 1. Horas de bolsa usadas por día ----------
alter table fichajes
  add column if not exists bolsa_minutos int
  check (bolsa_minutos is null or bolsa_minutos > 0);

-- ---------- 2. Saldo inicial y ajustes ----------
-- es_inicial: el saldo de partida; `fecha` es desde cuándo cuentan los
-- fichajes (los anteriores se ignoran para no contarlos dos veces).
-- Solo puede haber uno por usuario y puede valer 0 ("empiezo de cero").
create table if not exists ajustes_bolsa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha date not null default current_date,
  minutos int not null,
  motivo text check (motivo is null or char_length(motivo) <= 200),
  es_inicial boolean not null default false,
  created_at timestamptz not null default now(),
  check (es_inicial or minutos <> 0)
);

create unique index if not exists ajustes_bolsa_un_inicial
  on ajustes_bolsa (user_id) where es_inicial;

alter table ajustes_bolsa enable row level security;

-- Cada usuario gestiona sus ajustes; el admin puede leerlos
drop policy if exists "ajustes_bolsa_select_own" on ajustes_bolsa;
create policy "ajustes_bolsa_select_own" on ajustes_bolsa
  for select using (auth.uid() = user_id or es_admin());
drop policy if exists "ajustes_bolsa_insert_own" on ajustes_bolsa;
create policy "ajustes_bolsa_insert_own" on ajustes_bolsa
  for insert with check (auth.uid() = user_id);
drop policy if exists "ajustes_bolsa_update_own" on ajustes_bolsa;
create policy "ajustes_bolsa_update_own" on ajustes_bolsa
  for update using (auth.uid() = user_id);
drop policy if exists "ajustes_bolsa_delete_own" on ajustes_bolsa;
create policy "ajustes_bolsa_delete_own" on ajustes_bolsa
  for delete using (auth.uid() = user_id);
