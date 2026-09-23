# 🕐 TempoMio

> A Progressive Web App to track work clock-in/out and automatically calculate accumulated overtime.

**Live demo:** [tempomio.vercel.app](https://tempomio.vercel.app)

TempoMio digitizes the manual process of signing an attendance sheet. Instead of writing hours on paper or in a notes app, the user taps a button to clock in and out, and the app automatically computes overtime against a configurable base schedule — showing the balance accumulated toward a day off.

## ✨ Features

- **One-tap clock-in / clock-out** — the main screen shows only the relevant action based on the current state
- **Automatic overtime calculation** — compares actual hours worked against the theoretical base schedule
- **Weekly & monthly summaries** — see accumulated overtime at a glance, color-coded (green = surplus, red = deficit)
- **Interactive calendar history** — tap any past day to add or edit its hours; ideal for backfilling
- **Configurable base schedule** — set working hours per weekday, editable from the app
- **User profile** — personalized greeting and editable name
- **Request access** — visitors without an account can leave their email from the login screen; no self-service sign-up yet, accounts are still created by hand in Supabase
- **Installable as a PWA** — add to home screen on iOS/Android for a native-like experience
- **Secure by design** — Row Level Security ensures each user only accesses their own data

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| PWA | vite-plugin-pwa |
| Hosting | Vercel (CI/CD on every push) |

## 🏗️ Architecture

The app is a single-page application backed by Supabase. Authentication persists the session locally, and all data access is protected by PostgreSQL Row Level Security policies (`auth.uid() = user_id`), so the public API key is safe to expose in the client.

Overtime is calculated on the fly in the client rather than stored, comparing each clock-in against the base schedule for that weekday, then grouped by ISO week and by month.

### Data model

- `perfiles` — user profile (id linked to `auth.users`, name)
- `horarios_base` — theoretical schedule per weekday
- `fichajes` — actual clock-in/out records, one per day
- `solicitudes_acceso` — emails left via "Solicitar acceso" on the login screen; anyone can insert, nobody can read from the client (check it from the Supabase dashboard)

## 🚀 Getting Started

​```bash
# Clone and install
git clone https://github.com/Moulman/tempomio.git
cd tempomio
npm install

# Configure environment
cp .env.example .env
# Add your Supabase URL and anon key to .env

# Run
npm run dev
​```

Then run the SQL in `supabase/schema.sql` in your Supabase project to create the tables and policies.

## 📄 License

Personal project — free to explore and learn from.