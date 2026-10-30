import { expect, test } from '@playwright/test'
import { CONTRASENA, completarBienvenida, crearUsuaria, enlaceDelEmail, iniciarSesion } from './ayudas'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './entorno'

test('con «¿Has olvidado tu contraseña?» llega un email, se elige una nueva y se entra con ella', async ({ page, browser }) => {
    const email = await crearUsuaria()

    await page.goto('/')
    await page.getByRole('button', { name: '¿Has olvidado tu contraseña?' }).click()
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Enviar enlace' }).click()
    await expect(page.getByRole('status')).toContainText('te llegará un email')

    const enlace = await enlaceDelEmail(email, 'Cambia tu contraseña de TempoMio')
    expect(enlace).toContain('/aceptar?token_hash=')

    const suMovil = await browser.newContext()
    const movil = await suMovil.newPage()
    await movil.goto(enlace)
    await expect(movil.getByRole('heading', { name: 'Cambia tu contraseña' })).toBeVisible()
    await movil.getByRole('button', { name: 'Elegir contraseña nueva' }).click()
    await expect(movil.getByRole('heading', { name: 'Elige tu contraseña' })).toBeVisible()

    // Si elige la misma que ya tenía, se le dice claramente
    await movil.getByLabel('Contraseña', { exact: true }).fill(CONTRASENA)
    await movil.getByLabel('Repite la contraseña').fill(CONTRASENA)
    await movil.getByRole('button', { name: 'Guardar y entrar' }).click()
    await expect(movil.getByRole('alert')).toContainText('distinta')

    await movil.getByLabel('Contraseña', { exact: true }).fill('482913')
    await movil.getByLabel('Repite la contraseña').fill('482913')
    await movil.getByRole('button', { name: 'Guardar y entrar' }).click()
    await expect(movil.getByRole('heading', { name: '¡Te damos la bienvenida a TempoMio!' })).toBeVisible()
    await suMovil.close()

    // Otro día: la nueva funciona y la antigua ya no
    const otroDia = await browser.newContext()
    const login = await otroDia.newPage()
    await iniciarSesion(login, email, CONTRASENA)
    await expect(login.getByText('Email o contraseña incorrectos.')).toBeVisible()
    await login.getByPlaceholder('Contraseña').fill('482913')
    await login.getByRole('button', { name: 'Entrar' }).click()
    await expect(login.getByRole('heading', { name: '¡Te damos la bienvenida a TempoMio!' })).toBeVisible()
    await otroDia.close()
})

test('pedir el enlace con un email sin cuenta no revela que no existe', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '¿Has olvidado tu contraseña?' }).click()
    await page.getByLabel('Email').fill(`nadie-${Date.now()}@test.local`)
    await page.getByRole('button', { name: 'Enviar enlace' }).click()
    await expect(page.getByRole('status')).toContainText('Si ')
})

test('desde Perfil se cambia la contraseña y la nueva sirve para entrar', async ({ page, browser }) => {
    const email = await crearUsuaria()
    await iniciarSesion(page, email)
    await completarBienvenida(page, 'Vera')
    await page.goto('/perfil')

    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await page.getByLabel('Contraseña nueva', { exact: true }).fill('731905')
    await page.getByLabel('Repite la contraseña nueva').fill('731905')
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()
    await expect(page.getByText('Contraseña cambiada ✓')).toBeVisible()

    const otro = await browser.newContext()
    const login = await otro.newPage()
    await iniciarSesion(login, email, '731905')
    await expect(login.getByText('Hola, Vera')).toBeVisible()
    await otro.close()
})

test('cerrar sesión en un dispositivo no la cierra en los demás', async ({ page, browser }) => {
    const email = await crearUsuaria()
    await iniciarSesion(page, email)
    await completarBienvenida(page, 'Lola')
    await expect(page.getByText('Hola, Lola')).toBeVisible()

    // Mismo usuario en otro dispositivo
    const otro = await browser.newContext()
    const movil = await otro.newPage()
    await iniciarSesion(movil, email)
    await expect(movil.getByText('Hola, Lola')).toBeVisible()

    // Cierra sesión en el primero
    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Cerrar sesión' }).last().click()
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()

    // El otro sigue dentro. No basta con ver la pantalla (los datos se leen con un
    // token que sigue valiendo un rato): se pregunta al servidor si su sesión vive
    const estado = await movil.evaluate(async ({ url, clave }) => {
        const nombre = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))
        const token = nombre ? JSON.parse(localStorage.getItem(nombre)!).access_token : ''
        const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: clave, Authorization: `Bearer ${token}` } })
        return r.status
    }, { url: SUPABASE_URL, clave: SUPABASE_ANON_KEY })
    expect(estado).toBe(200)
    await otro.close()
})
