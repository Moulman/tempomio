---
paths:
  - "supabase/**"
---

# Base de datos (Supabase / Postgres)

- Nunca ejecutes nada contra el Supabase de producción. Escribe el SQL y dile a Mouldi qué ejecutar y dónde; que lo pruebe primero en un proyecto aparte.
- Cada cambio es un archivo nuevo `supabase/migrations/AAAAMMDDHHMMSS_descripcion.sql`. No edites una migración que ya se aplicó.
- Las migraciones solo añaden y se pueden ejecutar más de una vez: `create table if not exists`, `add column if not exists`, `create or replace function`, `drop policy if exists` antes de `create policy`.
- Nada de `drop`, `delete`, `truncate` ni `alter ... drop` sin que Mouldi lo pida expresamente. Si hace falta, explícalo antes.
- Cabecera de comentario en cada migración: qué hace, por qué, si borra o modifica datos y si es re-ejecutable.
- Tabla nueva = `enable row level security` y policies explícitas. Por defecto, `auth.uid() = user_id`. El acceso de admin va solo por `es_admin()`, siguiendo el patrón de `schema.sql`.
- Las funciones `SECURITY DEFINER` siguen el patrón de `es_admin()` de `schema.sql`. No des permisos nuevos a `anon` salvo que sea imprescindible, como el insert de `solicitudes_acceso`.
- Tras cada migración, actualiza `supabase/schema.sql` para que siga siendo el esquema completo y actual.
- Comentarios en español, como en los archivos existentes.
