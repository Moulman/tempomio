import { expect, test } from '@playwright/test'
import { completarBienvenida, crearUsuaria, iniciarSesion } from './ayudas'

test('una usuaria nueva completa la bienvenida, ficha entrada y salida, y se guarda', async ({ page }) => {
    const email = await crearUsuaria()
    await iniciarSesion(page, email)

    // Bienvenida en tres pasos
    await expect(page.getByRole('heading', { name: '¡Te damos la bienvenida a TempoMio!' })).toBeVisible()
    await completarBienvenida(page, 'Ana')

    // Pantalla Hoy, sin fichar todavía
    await expect(page.getByText('Hola, Ana')).toBeVisible()
    await expect(page.getByText('Sin fichar')).toBeVisible()

    await page.getByRole('button', { name: 'Marcar entrada' }).click()
    await expect(page.getByText('En turno').first()).toBeVisible()

    // Sin horario no se pregunta por la bolsa al salir
    await page.getByRole('button', { name: 'Marcar salida' }).first().click()
    await expect(page.getByText('Jornada terminada')).toBeVisible()

    // Al recargar, el fichaje sigue ahí: está guardado en la base de datos
    await page.reload()
    await expect(page.getByText('Jornada terminada')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Marcar entrada' })).toHaveCount(0)
})
