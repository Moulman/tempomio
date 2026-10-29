import { expect, test } from '@playwright/test'
import { completarBienvenida, crearUsuaria, iniciarSesion } from './ayudas'

test('marcar la entrada sin querer y deshacerla deja el día sin fichar', async ({ page }) => {
    const email = await crearUsuaria()
    await iniciarSesion(page, email)
    await completarBienvenida(page, 'Marco')

    await page.getByRole('button', { name: 'Marcar entrada' }).click()
    const aviso = page.getByRole('status')
    await expect(aviso).toContainText('Entrada marcada a las')

    await aviso.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.getByText('Sin fichar')).toBeVisible()
    await expect(aviso.getByRole('button', { name: 'Deshacer' })).toHaveCount(0)

    // Está deshecho en la base de datos, no solo en pantalla
    await page.reload()
    await expect(page.getByRole('button', { name: 'Marcar entrada' })).toBeVisible()
})

test('deshacer la salida vuelve a dejar el turno abierto', async ({ page }) => {
    const email = await crearUsuaria()
    await iniciarSesion(page, email)
    await completarBienvenida(page, 'Iris')

    await page.getByRole('button', { name: 'Marcar entrada' }).click()
    await expect(page.getByText('En turno').first()).toBeVisible()

    // Sin horario no se pregunta por la bolsa al salir
    await page.getByRole('button', { name: 'Marcar salida' }).first().click()
    const aviso = page.getByRole('status')
    await expect(aviso).toContainText('Salida marcada a las')

    await aviso.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.getByText('En turno').first()).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: 'Marcar salida' }).first()).toBeVisible()
})
