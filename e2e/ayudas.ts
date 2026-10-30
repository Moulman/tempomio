import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { SUPABASE_URL } from './entorno'

export const CONTRASENA = 'test-e2e-1234'

// Email único por test: cada test tiene su propia usuaria y sus propios datos
export function emailUnico(prefijo = 'e2e'): string {
    return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`
}

// Crea una usuaria nueva en Supabase local. El registro libre está cerrado (como en
// producción), así que se crea como lo haría la admin: con la clave secreta local.
export async function crearUsuaria(): Promise<string> {
    const email = emailUnico()
    const { error } = await clienteAdmin().auth.admin.createUser({ email, password: CONTRASENA, email_confirm: true })
    if (error) throw new Error(`No se pudo crear la usuaria de prueba: ${error.message}. ¿Está Supabase local en marcha?`)
    return email
}

export async function iniciarSesion(page: Page, email: string, contrasena = CONTRASENA) {
    await page.goto('/')
    await page.getByPlaceholder('Email', { exact: true }).fill(email)
    await page.getByPlaceholder('Contraseña').fill(contrasena)
    await page.getByRole('button', { name: 'Entrar' }).click()
}

// La bienvenida termina cuando se ha guardado el saldo inicial y la app pasa a
// las pantallas normales. Hay que esperarlo: si el test navega antes, la página
// se recarga sin saldo guardado y la app vuelve a enseñar la bienvenida.
async function esperarFinBienvenida(page: Page) {
    await expect(page.getByRole('heading', { name: '¡Te damos la bienvenida a TempoMio!' })).toHaveCount(0)
}

// Bienvenida mínima: nombre, sin horario y bolsa desde cero
export async function completarBienvenida(page: Page, nombre: string) {
    await page.getByPlaceholder('Tu nombre').fill(nombre)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Lo pondré más tarde' }).click()
    await page.getByRole('button', { name: 'Empiezo de cero' }).click()
    await esperarFinBienvenida(page)
}

// Bienvenida con saldo inicial en la bolsa (a fecha de hoy)
export async function completarBienvenidaConSaldo(page: Page, nombre: string, horas: number) {
    await page.getByPlaceholder('Tu nombre').fill(nombre)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Lo pondré más tarde' }).click()
    await page.getByRole('button', { name: 'Ya tengo horas acumuladas' }).click()
    await page.getByLabel('Horas', { exact: true }).fill(String(horas))
    await page.getByRole('button', { name: 'Empezar' }).click()
    await esperarFinBienvenida(page)
}

// Clave secreta del Supabase LOCAL, leída al ejecutar (nunca escrita en el repo:
// el push protection de GitHub la bloquearía, con razón)
function claveSecretaLocal(): string {
    const salida = execSync('supabase status -o json', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] })
    const estado = JSON.parse(salida.slice(salida.indexOf('{'))) as Record<string, string>
    const clave = estado.SECRET_KEY ?? estado.SERVICE_ROLE_KEY
    if (!clave) throw new Error('No se encontró la clave secreta en `supabase status`. ¿Está Supabase local en marcha?')
    return clave
}

// Cliente con la clave secreta del Supabase LOCAL (solo para preparar datos de prueba)
export function clienteAdmin() {
    return createClient(SUPABASE_URL, claveSecretaLocal(), { auth: { persistSession: false } })
}

// Convierte una usuaria de prueba en admin. Desde la app no se puede (lo impide
// un trigger), así que se hace con la clave secreta, como desde el panel de Supabase.
export async function hacerAdmin(email: string, nombre: string) {
    const admin = clienteAdmin()
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (error) throw new Error(`No se pudo leer las usuarias: ${error.message}`)
    const usuaria = data.users.find((u) => u.email === email)
    if (!usuaria) throw new Error(`No existe la usuaria ${email}`)
    const { error: errorPerfil } = await admin.from('perfiles').upsert({ id: usuaria.id, nombre, es_admin: true })
    if (errorPerfil) throw new Error(`No se pudo hacer admin: ${errorPerfil.message}`)
}

// Mailpit: el buzón falso de Supabase local. Los emails llegan aquí y no a nadie de verdad.
const MAILPIT = 'http://127.0.0.1:54324'

// Espera a que `email` tenga al menos `minimo` emails con ese asunto y devuelve
// el enlace del más reciente (Mailpit los da del más nuevo al más antiguo)
export async function enlaceDelEmail(email: string, asunto: string, minimo = 1): Promise<string> {
    const consulta = encodeURIComponent(`to:"${email}" subject:"${asunto}"`)
    for (let intento = 0; intento < 30; intento++) {
        const busqueda = await fetch(`${MAILPIT}/api/v1/search?query=${consulta}`)
        const { messages } = (await busqueda.json()) as { messages?: { ID: string }[] }
        if (messages && messages.length >= minimo) {
            const mensaje = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { HTML: string }
            const enlace = mensaje.HTML.match(/href="([^"]+)"/)?.[1]
            if (enlace) return enlace.replaceAll('&amp;', '&')
        }
        await new Promise((r) => setTimeout(r, 500))
    }
    throw new Error(`No ha llegado el email «${asunto}» a ${email}. ¿Está Supabase local en marcha?`)
}
