// Supabase LOCAL para los tests E2E (claves por defecto del entorno local de
// `supabase start`: no valen fuera de tu máquina). Nunca producción.
export const SUPABASE_URL = 'http://127.0.0.1:54321'
export const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

if (!SUPABASE_URL.startsWith('http://127.0.0.1')) {
    throw new Error('Los tests E2E solo pueden usar Supabase local')
}
