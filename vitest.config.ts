import { defineConfig } from 'vitest/config'

// Configuración solo para tests (sin el plugin de PWA de vite.config.ts).
// La zona horaria se fija en el script de package.json (TZ=Europe/Madrid).
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',
        // Valores falsos a propósito: un test unitario nunca habla con un Supabase real
        env: {
            VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
            VITE_SUPABASE_ANON_KEY: 'clave-falsa-de-test',
        },
    },
})
