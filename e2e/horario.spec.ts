import { expect, test } from '@playwright/test'
import { completarBienvenida, crearUsuaria, iniciarSesion } from './ayudas'

test('configurar el horario base marcando días libres con el botón "Libre"', async ({ page }) => {
    const email = await crearUsuaria()
    await iniciarSesion(page, email)
    await completarBienvenida(page, 'Sara')
    await expect(page.getByText('Hola, Sara')).toBeVisible()

    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Editar', exact: true }).click()
    const editor = page.getByRole('heading', { name: 'Editar horario base' }).locator('..')

    // Sin horario todavía: todos los días empiezan como libres
    await editor.getByRole('button', { name: 'Añadir horario el lunes' }).click()
    await editor.getByLabel('Entrada lunes').fill('09:00')
    await editor.getByLabel('Salida lunes').fill('17:00')

    await editor.getByRole('button', { name: 'Añadir horario el martes' }).click()
    await editor.getByLabel('Entrada martes').fill('09:00')
    await editor.getByLabel('Salida martes').fill('14:00')

    // Lo marca libre y lo vuelve a abrir: las horas se recuerdan
    await editor.getByRole('button', { name: 'Marcar martes como libre' }).click()
    await expect(editor.getByLabel('Entrada martes')).toHaveCount(0)
    await editor.getByRole('button', { name: 'Añadir horario el martes' }).click()
    await expect(editor.getByLabel('Entrada martes')).toHaveValue('09:00')

    // Al final el martes queda libre
    await editor.getByRole('button', { name: 'Marcar martes como libre' }).click()
    await editor.getByRole('button', { name: 'Guardar', exact: true }).click()

    const lunes = page.locator('li', { hasText: 'Lunes' })
    const martes = page.locator('li', { hasText: 'Martes' })
    await expect(lunes).toContainText('09:00 – 17:00')
    await expect(martes).toContainText('Libre')

    // Guardado en la base de datos: sigue igual al recargar
    await page.reload()
    await expect(lunes).toContainText('09:00 – 17:00')
    await expect(martes).toContainText('Libre')
})
