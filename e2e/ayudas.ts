import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './entorno'

export const CONTRASENA = 'test-e2e-1234'

// Email único por test: cada test tiene su propia usuaria y sus propios datos
export function emailUnico(prefijo = 'e2e'): string {
    return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`
}

// Crea una usuaria nueva en Supabase local (allí no hace falta confirmar el email)
export async function crearUsuaria(): Promise<string> {
    const email = emailUnico()
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const { error } = await supabase.auth.signUp({ email, password: CONTRASENA })
    if (error) throw new Error(`No se pudo crear la usuaria de prueba: ${error.message}. ¿Está Supabase local en marcha?`)
    return email
}

export async function iniciarSesion(page: Page, email: string, contrasena = CONTRASENA) {
    await page.goto('/')
    await page.getByPlaceholder('Email', { exact: true }).fill(email)
    await page.getByPlaceholder('Contraseña').fill(contrasena)
    await page.getByRole('button', { name: 'Entrar' }).click()
}

// Bienvenida mínima: nombre, sin horario y bolsa desde cero
export async function completarBienvenida(page: Page, nombre: string) {
    await page.getByPlaceholder('Tu nombre').fill(nombre)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Lo pondré más tarde' }).click()
    await page.getByRole('button', { name: 'Empiezo de cero' }).click()
}

// Bienvenida con saldo inicial en la bolsa (a fecha de hoy)
export async function completarBienvenidaConSaldo(page: Page, nombre: string, horas: number) {
    await page.getByPlaceholder('Tu nombre').fill(nombre)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Lo pondré más tarde' }).click()
    await page.getByRole('button', { name: 'Ya tengo horas acumuladas' }).click()
    await page.getByLabel('Horas', { exact: true }).fill(String(horas))
    await page.getByRole('button', { name: 'Empezar' }).click()
}
