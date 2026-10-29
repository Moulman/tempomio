import { expect, test } from '@playwright/test'
import { completarBienvenida, crearUsuaria, hacerAdmin, iniciarSesion } from './ayudas'

test('una idea enviada desde Ideas le llega a la admin en su panel', async ({ page: usuaria, browser }) => {
    const textoIdea = `Poder exportar el año entero (${Date.now()})`

    // 1. Una usuaria normal envía una idea
    await iniciarSesion(usuaria, await crearUsuaria())
    await completarBienvenida(usuaria, 'Nora')
    await expect(usuaria.getByText('Hola, Nora')).toBeVisible()

    await usuaria.goto('/ideas')
    await usuaria.getByRole('radio', { name: 'Lo necesito ya' }).click()
    await expect(usuaria.getByRole('radio', { name: 'Lo necesito ya' })).toHaveAttribute('aria-checked', 'true')
    await usuaria.getByRole('textbox').fill(textoIdea)
    await usuaria.getByRole('button', { name: 'Enviar idea' }).click()
    await expect(usuaria.getByText('¡Recibido!')).toBeVisible()

    // Una usuaria normal no puede entrar en el panel de admin
    await usuaria.goto('/admin')
    await expect(usuaria.getByText('Ideas recibidas')).toHaveCount(0)

    // 2. La admin (en otra sesión, como en otro móvil) la ve en su panel
    const emailAdmin = await crearUsuaria()
    await hacerAdmin(emailAdmin, 'Admin')
    // Contexto aparte: otra sesión independiente, como otro móvil
    const contextoAdmin = await browser.newContext()
    const admin = await contextoAdmin.newPage()
    await iniciarSesion(admin, emailAdmin)
    await completarBienvenida(admin, 'Admin')
    await expect(admin.getByText('Hola, Admin')).toBeVisible()

    await admin.goto('/admin/ideas')
    await expect(admin.getByText(/Ideas recibidas/)).toBeVisible()
    await expect(admin.getByText(textoIdea)).toBeVisible()
    await contextoAdmin.close()
})
