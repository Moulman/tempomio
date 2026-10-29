import { expect, test } from '@playwright/test'
import { crearUsuaria, emailUnico, iniciarSesion } from './ayudas'

test('con una contraseña incorrecta muestra un error y no entra', async ({ page }) => {
    const email = await crearUsuaria()
    await iniciarSesion(page, email, 'contrasena-mal')

    await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('un visitante sin cuenta puede apuntarse a la lista de espera', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Solicitar acceso' }).click()
    await page.getByPlaceholder('Tu email').fill(emailUnico('espera'))
    // El botón de enviar está dentro del formulario (la pestaña se llama igual)
    await page.locator('form').getByRole('button', { name: 'Solicitar acceso' }).click()

    await expect(page.getByText('¡Gracias! Te avisaremos')).toBeVisible()
})
