import { expect, test } from '@playwright/test'
import { completarBienvenidaConSaldo, crearUsuaria, iniciarSesion } from './ayudas'

test('usar horas de la bolsa descuenta el saldo y prepara el mensaje para la jefa', async ({ page }) => {
    const email = await crearUsuaria()
    await iniciarSesion(page, email)
    await completarBienvenidaConSaldo(page, 'Eva', 10)
    await expect(page.getByText('Hola, Eva')).toBeVisible()

    await page.goto('/bolsa')
    const saldo = page.locator('section').filter({ has: page.getByText('Disponible', { exact: true }) })
    await expect(saldo.getByText('+10h', { exact: true }).first()).toBeVisible()

    // Usa 2h hoy
    await page.getByRole('button', { name: 'Usar horas' }).click()
    await page.getByLabel('Horas', { exact: true }).fill('2')
    await expect(page.getByText('Te quedarán')).toContainText('+8h')
    await page.getByRole('button', { name: 'Apuntar' }).click()

    // Tras apuntarlo, propone el mensaje con el saldo que tenía antes de usarlas
    await expect(page.getByRole('heading', { name: 'Mensaje para tu jefa' })).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveValue(/^Hola, tengo 10h acumuladas en mi bolsa de horas\. Me gustaría usar 2h el /)
    // exact: en escritorio también existe el botón "Cerrar sesión"
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click()

    // El saldo ya está descontado, y se mantiene al recargar
    await expect(saldo).toContainText('+8h')
    await page.reload()
    await expect(saldo).toContainText('+8h')
    await expect(page.getByText('Bolsa usada (previsto)')).toBeVisible()
})
