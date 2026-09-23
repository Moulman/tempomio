-- ============================================================
-- TempoMio — database schema
-- Run this in your Supabase project: SQL Editor > New query
-- ============================================================

-- ---------- Table: user profiles ----------
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  created_at timestamptz not null default now()
);

-- ---------- Table: base schedule per weekday (0 = Sunday ... 6 = Saturday) ----------
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

-- ---------- Table: actual clock-in/out records, one per day ----------
create table if not exists fichajes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha date not null,
  hora_entrada time,
  hora_salida time,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fecha)
);

-- ---------- Table: public access requests (waitlist for onboarding) ----------
create table if not exists solicitudes_acceso (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- Trigger: keep updated_at fresh on fichajes ----------
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

-- ============================================================
-- Row Level Security: each user only accesses their own data
-- ============================================================
alter table perfiles enable row level security;
alter table horarios_base enable row level security;
alter table fichajes enable row level security;
alter table solicitudes_acceso enable row level security;

-- Policies: perfiles
create policy "perfiles_select_own" on perfiles
  for select using (auth.uid() = id);
create policy "perfiles_insert_own" on perfiles
  for insert with check (auth.uid() = id);
create policy "perfiles_update_own" on perfiles
  for update using (auth.uid() = id);

-- Policies: horarios_base
create policy "horarios_base_select_own" on horarios_base
  for select using (auth.uid() = user_id);
create policy "horarios_base_insert_own" on horarios_base
  for insert with check (auth.uid() = user_id);
create policy "horarios_base_update_own" on horarios_base
  for update using (auth.uid() = user_id);
create policy "horarios_base_delete_own" on horarios_base
  for delete using (auth.uid() = user_id);

-- Policies: fichajes
create policy "fichajes_select_own" on fichajes
  for select using (auth.uid() = user_id);
create policy "fichajes_insert_own" on fichajes
  for insert with check (auth.uid() = user_id);
create policy "fichajes_update_own" on fichajes
  for update using (auth.uid() = user_id);
create policy "fichajes_delete_own" on fichajes
  for delete using (auth.uid() = user_id);

-- Policies: solicitudes_acceso
-- Anyone (including anonymous visitors on the login screen) can submit a
-- request. No select/update/delete policy is defined, so the request list
-- is only readable from the Supabase dashboard (or the service role),
-- never from the public anon client.
create policy "solicitudes_acceso_insert_public" on solicitudes_acceso
  for insert
  to anon, authenticated
  with check (true);