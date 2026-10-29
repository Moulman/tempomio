import { expect, test } from '@playwright/test'
import { completarBienvenida, crearUsuaria, iniciarSesion } from './ayudas'

// La barra inferior solo existe en el móvil (en escritorio hay barra lateral)
test.describe('barra inferior del móvil', () => {
    test.skip(({ isMobile }) => !isMobile, 'La barra inferior solo se ve en el móvil')

    test('tiene Semana, Historial, Hoy, Bolsa y Perfil, y el botón central muestra el estado del día', async ({ page }) => {
        const email = await crearUsuaria()
        await iniciarSesion(page, email)
        await completarBienvenida(page, 'Lucía')

        const barra = page.getByRole('navigation', { name: 'Navegación principal' })
        for (const nombre of ['Semana', 'Historial', 'Bolsa', 'Perfil']) {
            await expect(barra.getByRole('link', { name: nombre, exact: true })).toBeVisible()
        }
        await expect(barra.getByRole('link', { name: 'Hoy, sin fichar' })).toHaveAttribute('aria-current', 'page')

        // Bolsa ya está en la barra
        await barra.getByRole('link', { name: 'Bolsa', exact: true }).click()
        await expect(page.getByRole('heading', { name: 'Bolsa de horas' })).toBeVisible()

        // El botón central lleva a Hoy, pero no ficha
        await barra.getByRole('link', { name: 'Hoy, sin fichar' }).click()
        await expect(page.getByText('Sin fichar')).toBeVisible()

        await page.getByRole('button', { name: 'Marcar entrada' }).click()
        await expect(barra.getByRole('link', { name: /^Hoy, en turno/ })).toBeVisible()
    })

    test('Ideas se abre desde Perfil, que sigue marcado en la barra', async ({ page }) => {
        const email = await crearUsuaria()
        await iniciarSesion(page, email)
        await completarBienvenida(page, 'Nora')

        const barra = page.getByRole('navigation', { name: 'Navegación principal' })
        await barra.getByRole('link', { name: 'Perfil', exact: true }).click()
        await page.getByRole('link', { name: 'Contar una idea', exact: true }).click()

        await expect(page.getByRole('heading', { name: 'Ideas', exact: true })).toBeVisible()
        await expect(barra.getByRole('link', { name: 'Perfil', exact: true })).toHaveAttribute('aria-current', 'page')
    })
})
