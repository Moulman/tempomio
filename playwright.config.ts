import { defineConfig, devices } from '@playwright/test'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './e2e/entorno'

// Tests E2E: la app de verdad en un navegador real, contra Supabase LOCAL.
// Antes de ejecutarlos: `supabase start`. Después: `npm run test:e2e`.

const PUERTO = 5174 // distinto del 5173 de `npm run dev`, para no chocar

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${PUERTO}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        locale: 'es-ES',
        timezoneId: 'Europe/Madrid',
    },
    projects: [
        { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
        { name: 'iphone', use: { ...devices['iPhone 14'] } },
    ],
    webServer: {
        command: `npm run dev -- --port ${PUERTO} --strictPort`,
        url: `http://localhost:${PUERTO}`,
        reuseExistingServer: !process.env.CI,
        // Las variables de entorno tienen prioridad sobre .env: la app de los
        // tests apunta siempre a Supabase local, nunca a producción
        env: {
            VITE_SUPABASE_URL: SUPABASE_URL,
            VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
        },
    },
})
