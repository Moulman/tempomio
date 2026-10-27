# TempoMio

PWA móvil para fichar entrada y salida y llevar la bolsa de horas extra de cada persona. La usan a diario unas pocas personas reales, en producción: la estabilidad va antes que la velocidad.

Dueño: Mansour Mouldi (GitHub: Moulman). Repo: github.com/Moulman/tempomio. Producción: tempomio.vercel.app.

<!-- Nota para quien mantiene este archivo: mantenlo por debajo de 200 líneas y con instrucciones comprobables. Lo específico de un área va en .claude/rules/. Este comentario no se carga en el contexto. -->

## Reglas innegociables (producción)

- `main` es producción: Vercel despliega solo desde `main`. Nunca hagas commit, merge, rebase, push ni force-push a `main`, ni abras pull requests hacia `main`. Trabaja solo en la rama que se te indique y comprueba con `git branch --show-current` al empezar y antes de cada commit. Si estás en `main`, para y avisa. El paso a producción lo decide y lo ejecuta Mouldi.
- `.env` apunta al Supabase de PRODUCCIÓN, con datos reales. No ejecutes SQL, migraciones ni cambios de datos contra él, ni `supabase db push` / `supabase db reset`. Los cambios de base de datos son archivos en `supabase/migrations/`: dile a Mouldi qué ejecutar y dónde. Lo ideal es probarlos antes en un proyecto de Supabase aparte.
- Secretos: nunca subas `.env`. El cliente usa solo la anon key pública; nunca uses ni pidas la service-role key.
- No uses `git add -A` ni `git add .`: añade los archivos por nombre. Hay carpetas sueltas (por ejemplo `Claude outputs/`) que no deben entrar en ningún commit.
- Commits pequeños, en español, con prefijo Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `fix(db):`, y `wip:` solo para guardar trabajo a medias.
- Si dudas de si una acción afecta a producción, para y pregunta.
- Estas reglas se refuerzan con un hook (`.claude/hooks/protect-production.sh`). Si bloquea algo, no lo rodees: explica a Mouldi qué necesitabas hacer.

## Comandos

- `npm run dev`: servidor de desarrollo
- `npm run build`: comprobación de tipos (`tsc -b`) y build de producción
- `npm run lint`: ESLint
- `npm run preview`: sirve el build
- No hay tests automáticos todavía. Antes de dar algo por terminado: `npm run build && npm run lint` sin errores.

## Stack

React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 7, supabase-js 2, vite-plugin-pwa. No hay backend propio: el cliente habla directo con Supabase y la seguridad es RLS. Despliegue en Vercel (`vercel.json` reescribe todo a la SPA).

## Mapa del código

- `src/App.tsx`: sesión, perfil, horarios base, bolsa y rutas
- `src/pages/`: una por ruta. `/` Hoy (PaginaPrincipal), `/semana`, `/historial`, `/bolsa`, `/ideas`, `/perfil`, `/admin`
- `src/components/`: Estructura (layout y navegación), Fichaje, HorarioBase, TarjetaBolsa, EditorDia, CampoHoras, Bienvenida, Login, Racha, Iconos
- `src/lib/`: lógica pura y hooks. `schedule.ts` (minutos, extra del día, fechas), `bolsa.ts`, `csv.ts`, `tema.ts`, `fichajeHoy.ts`, `sugerencias.ts`
- `supabase/`: `schema.sql` (esquema completo, reconstruido del código) y `migrations/` (SQL con marca de tiempo)

## Dominio: lo que no se debe romper

- Un fichaje por persona y día: `fichajes` tiene `unique (user_id, fecha)`. No hay turno partido, ni tramos, ni objetivo semanal. Es una decisión tomada: la rama `feature/tramos` se descartó a propósito, ignórala.
- Extra del día = minutos trabajados − minutos del horario base de ese día de la semana. Sin horario ese día, todo cuenta como extra. Los turnos que cruzan la medianoche se calculan bien (`minutosTrabajados`).
- Extras y bolsa se calculan en el cliente al mostrarlos; no se guarda nada derivado. Bolsa disponible = ajustes (incluido el saldo inicial) + extra ganado − déficit − horas usadas. Solo cuentan los fichajes desde la fecha del saldo inicial. Vive en `calcularBolsa` (`src/lib/bolsa.ts`): son horas de personas reales, así que cualquier cambio ahí se revisa con cuidado y se explica.
- `fichajes.bolsa_minutos` son los minutos de bolsa usados ese día (mayor que 0).
- Las horas son columnas `time` de Postgres y llegan como `HH:MM:SS`: para mostrarlas usa `.slice(0, 5)`.
- `horarios_base.dia_semana`: 0 = domingo … 6 = sábado, igual que `Date.getDay()`. El calendario, en cambio, empieza en lunes.
- Fechas de día siempre en hora local con `fechaLocal()` (formato `YYYY-MM-DD`). Nunca `toISOString().slice(0, 10)`: da la fecha en UTC y en España se desplaza un día.
- `perfiles.es_admin` solo se cambia desde el panel de Supabase; un trigger lo protege de la app.

## Seguridad y base de datos

- RLS activada en todas las tablas: cada persona solo accede a sus filas (`auth.uid() = user_id`). La admin ve datos ajenos solo a través de `es_admin()` (`SECURITY DEFINER`).
- Tablas: `perfiles`, `horarios_base`, `fichajes`, `ajustes_bolsa`, `solicitudes_acceso`, `sugerencias`.
- Detalle y reglas de migraciones en `.claude/rules/database.md`.

## Convenciones de código

- La interfaz está solo en español. Los identificadores del dominio van en español (fichaje, horario, bolsa); los genéricos, en inglés. Los comentarios van en español y explican el porqué.
- 4 espacios de indentación en `src/`, comillas simples, sin punto y coma.
- Detalle en `.claude/rules/frontend.md`.

## Cómo trabajar

- En cambios grandes o ambiguos, primero un plan o especificación corta y espera el OK antes de implementar.
- Lee un archivo antes de editarlo y sigue el estilo de sus vecinos. Cambios mínimos y enfocados: no refactorices lo que no se pidió ni añadas dependencias sin preguntar.
- La app es móvil primero (PWA instalada en iPhone): comprueba pantalla estrecha y los dos temas, claro y oscuro.
- Al terminar, resume qué cambió, cómo probarlo y si Mouldi debe ejecutar algo en Supabase.

## Dirección actual (octubre 2026)

- Rediseño y funciones tipo Clockify (informes, timesheet, proyectos o etiquetas, dashboard solo para admin) con marca y código propios: no copies su marca, textos, estilo gráfico literal ni código. Para estudiar su comportamiento web está el MCP REA; no lo uses para saltarte autenticaciones.
- Licencia: todos los derechos reservados (archivo `LICENSE`). No añadas una licencia open source.
- `README.md` está en inglés y de cara a reclutadores: si cambia una función visible, actualízalo y mantenlo veraz.
