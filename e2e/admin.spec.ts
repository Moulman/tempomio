import { expect, test } from '@playwright/test'
import { completarBienvenida, crearUsuaria, hacerAdmin, iniciarSesion } from './ayudas'

test('la admin navega por las secciones de la zona de admin y los enlaces directos funcionan', async ({ page }) => {
    const email = await crearUsuaria()
    await hacerAdmin(email, 'Admin')
    await iniciarSesion(page, email)
    await completarBienvenida(page, 'Admin')

    await page.goto('/admin')
    const secciones = page.getByRole('navigation', { name: 'Secciones de admin' })
    await expect(page.getByRole('heading', { name: 'Pendiente de ti' })).toBeVisible()

    await secciones.getByRole('link', { name: /Lista de espera/ }).click()
    await expect(page).toHaveURL(/\/admin\/lista-de-espera$/)
    await expect(page.getByRole('heading', { name: 'Solicitudes pendientes' })).toBeVisible()

    await secciones.getByRole('link', { name: /Usuarias/ }).click()
    await expect(page.getByRole('heading', { name: /Usuarias/ })).toBeVisible()
    // Solo la fecha del último uso, no la hora de cada persona
    await expect(page.getByText('Último uso').first()).toBeVisible()

    // Un enlace directo sigue funcionando al recargar
    await page.reload()
    await expect(page.getByRole('heading', { name: /Usuarias/ })).toBeVisible()

    // Una sección que no existe vuelve al resumen
    await page.goto('/admin/no-existe')
    await expect(page).toHaveURL(/\/admin$/)
})

test('a una usuaria normal no se le descarga el código de la zona de admin', async ({ page }) => {
    const pedidos: string[] = []
    page.on('request', (r) => pedidos.push(r.url()))

    await iniciarSesion(page, await crearUsuaria())
    await completarBienvenida(page, 'Clara')
    await expect(page.getByText('Hola, Clara')).toBeVisible()

    // Aunque escriba la dirección a mano, la app la devuelve a Hoy
    await page.goto('/admin')
    await expect(page.getByText('Hola, Clara')).toBeVisible()
    expect(pedidos.filter((url) => url.includes('PaginaAdmin'))).toEqual([])
})
