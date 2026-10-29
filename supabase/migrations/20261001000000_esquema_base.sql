-- ============================================================
-- Esquema base de TempoMio (punto de partida de las migraciones)
--
-- SOLO PARA BASES NUEVAS: Supabase local y proyectos de pruebas.
-- Producción ya tiene estas tablas desde antes de usar migraciones,
-- así que este archivo NO se ejecuta allí.
--
-- Es una copia de supabase/schema.sql en esta fecha, para que
-- `supabase db reset` cree las tablas antes de aplicar las migraciones
-- siguientes (que dan por hecho que existen). Todo es idempotente
-- (if not exists, create or replace, drop policy if exists), así que
-- las migraciones posteriores se aplican encima sin conflictos.
--
-- No editar: los cambios nuevos van en migraciones nuevas, y
-- schema.sql se mantiene como referencia del esquema completo.
-- ============================================================

-- ---------- Tabla: perfiles ----------
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  es_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Tabla: horario base por día de la semana (0 = domingo ... 6 = sábado) ----------
create table if not exists horarios_base (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  hora_entrada time not null,
  hora_salida time not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, dia_semana)
);

-- ---------- Tabla: fichajes reales, uno por usuario y día ----------
-- Las horas se guardan con segundos desde el cronómetro ("HH:MM:SS");
-- las correcciones a mano llegan como "HH:MM".
create table if not exists fichajes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha date not null,
  hora_entrada time,
  hora_salida time,
  nota text,
  -- Horas de la bolsa usadas ese día (salir antes o día libre)
  bolsa_minutos int check (bolsa_minutos is null or bolsa_minutos > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fecha)
);
-- En una base ya creada sin la columna (ver migración 20261021100000_bolsa_horas.sql)
alter table fichajes
  add column if not exists bolsa_minutos int
  check (bolsa_minutos is null or bolsa_minutos > 0);

-- ---------- Tabla: lista de espera ("Solicitar acceso" en el login) ----------
-- El login solo envía el email; nombre y mensaje son opcionales.
-- estado null en filas antiguas cuenta como pendiente.
create table if not exists solicitudes_acceso (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nombre text,
  mensaje text,
  estado text default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  created_at timestamptz not null default now()
);

-- ---------- Tabla: ideas y sugerencias (página Ideas) ----------
create table if not exists sugerencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prioridad text not null check (prioridad in ('lo_necesito', 'estaria_guay', 'bug')),
  texto text not null check (char_length(texto) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- ---------- Tabla: bolsa de horas (saldo inicial y ajustes) ----------
-- es_inicial: saldo de partida; `fecha` es desde cuándo cuentan los
-- fichajes. Uno por usuario y puede valer 0 ("empiezo de cero").
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

-- ============================================================
-- Funciones y triggers
-- ============================================================

-- updated_at siempre al día en fichajes
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_fichajes_updated_at on fichajes;
create trigger trg_fichajes_updated_at
  before update on fichajes
  for each row execute function set_updated_at();

-- ¿El usuario actual es admin? security definer para poder usarla dentro
-- de las policies de perfiles sin recursión.
create or replace function es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from perfiles where id = auth.uid() and es_admin);
$$;

-- Nadie puede darse admin a sí mismo desde la app: para usuarios con
-- sesión (o anónimos) es_admin se fuerza a false al crear el perfil y no
-- cambia al actualizarlo. Desde el panel de Supabase (SQL Editor, Table
-- Editor) sí se puede cambiar.
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

-- ============================================================
-- Row Level Security: cada usuario solo accede a sus datos;
-- el admin (es_admin) puede leer los de todos para el panel.
-- ============================================================
alter table perfiles enable row level security;
alter table horarios_base enable row level security;
alter table fichajes enable row level security;
alter table solicitudes_acceso enable row level security;
alter table sugerencias enable row level security;
alter table ajustes_bolsa enable row level security;

-- ---------- perfiles ----------
drop policy if exists "perfiles_select_own" on perfiles;
create policy "perfiles_select_own" on perfiles
  for select using (auth.uid() = id);
drop policy if exists "perfiles_select_admin" on perfiles;
create policy "perfiles_select_admin" on perfiles
  for select using (es_admin());
drop policy if exists "perfiles_insert_own" on perfiles;
create policy "perfiles_insert_own" on perfiles
  for insert with check (auth.uid() = id);
drop policy if exists "perfiles_update_own" on perfiles;
create policy "perfiles_update_own" on perfiles
  for update using (auth.uid() = id);

-- ---------- horarios_base ----------
-- El admin puede leerlos; por eso la app filtra siempre por user_id.
drop policy if exists "horarios_base_select_own" on horarios_base;
create policy "horarios_base_select_own" on horarios_base
  for select using (auth.uid() = user_id or es_admin());
drop policy if exists "horarios_base_insert_own" on horarios_base;
create policy "horarios_base_insert_own" on horarios_base
  for insert with check (auth.uid() = user_id);
drop policy if exists "horarios_base_update_own" on horarios_base;
create policy "horarios_base_update_own" on horarios_base
  for update using (auth.uid() = user_id);
drop policy if exists "horarios_base_delete_own" on horarios_base;
create policy "horarios_base_delete_own" on horarios_base
  for delete using (auth.uid() = user_id);

-- ---------- fichajes ----------
-- El admin puede leerlos (actividad y último fichaje en el panel);
-- la app filtra siempre por user_id.
drop policy if exists "fichajes_select_own" on fichajes;
create policy "fichajes_select_own" on fichajes
  for select using (auth.uid() = user_id or es_admin());
drop policy if exists "fichajes_insert_own" on fichajes;
create policy "fichajes_insert_own" on fichajes
  for insert with check (auth.uid() = user_id);
drop policy if exists "fichajes_update_own" on fichajes;
create policy "fichajes_update_own" on fichajes
  for update using (auth.uid() = user_id);
drop policy if exists "fichajes_delete_own" on fichajes;
create policy "fichajes_delete_own" on fichajes
  for delete using (auth.uid() = user_id);

-- ---------- solicitudes_acceso ----------
-- Cualquiera (también sin sesión, desde el login) puede apuntarse;
-- solo el admin puede verlas y aprobarlas o rechazarlas.
drop policy if exists "solicitudes_acceso_insert_public" on solicitudes_acceso;
create policy "solicitudes_acceso_insert_public" on solicitudes_acceso
  for insert to anon, authenticated with check (true);
drop policy if exists "solicitudes_acceso_select_admin" on solicitudes_acceso;
create policy "solicitudes_acceso_select_admin" on solicitudes_acceso
  for select using (es_admin());
drop policy if exists "solicitudes_acceso_update_admin" on solicitudes_acceso;
create policy "solicitudes_acceso_update_admin" on solicitudes_acceso
  for update using (es_admin());

-- ---------- sugerencias ----------
-- Cada usuario envía las suyas; solo el admin las lee.
drop policy if exists "sugerencias_insert_own" on sugerencias;
create policy "sugerencias_insert_own" on sugerencias
  for insert with check (auth.uid() = user_id);
drop policy if exists "sugerencias_select_admin" on sugerencias;
create policy "sugerencias_select_admin" on sugerencias
  for select using (es_admin());

-- ---------- ajustes_bolsa ----------
-- Cada usuario gestiona sus ajustes; el admin puede leerlos.
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
