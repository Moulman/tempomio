import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { completarBienvenida, crearUsuaria, iniciarSesion } from './ayudas'

test('corregir a mano un día en Historial y descargar el CSV del mes', async ({ page }) => {
    const email = await crearUsuaria()
    await iniciarSesion(page, email)
    await completarBienvenida(page, 'Luz')
    await expect(page.getByText('Hola, Luz')).toBeVisible()

    await page.goto('/historial')
    await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible()
    // Sin fichajes no hay nada que descargar
    await expect(page.getByRole('button', { name: 'Descargar CSV' })).toBeDisabled()

    // Se olvidó fichar el día 1: lo apunta a mano
    await page.getByRole('button', { name: '1', exact: true }).click()
    await page.getByLabel('Entrada').fill('09:00')
    await page.getByLabel('Salida').fill('17:30')
    await page.getByLabel('Nota').fill('Olvidé fichar')
    await page.getByRole('button', { name: 'Guardar' }).click()

    // Sin horario base, las 8h 30min cuentan enteras como extra
    await expect(page.getByText('8h 30min', { exact: true })).toBeVisible()
    await expect(page.getByText('+8h 30min', { exact: true })).toBeVisible()

    // Al recargar sigue ahí
    await page.reload()
    await expect(page.getByText('+8h 30min', { exact: true })).toBeVisible()

    // El CSV del mes incluye el día corregido y su nota
    const descarga = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Descargar CSV' }).click()
    const archivo = await descarga
    expect(archivo.suggestedFilename()).toMatch(/^tempomio-\d{4}-\d{2}\.csv$/)
    const contenido = await readFile(await archivo.path(), 'utf-8')
    expect(contenido).toContain('Fecha;Día;Tipo;Entrada;Salida;Trabajado;Bolsa usada;Previsto;Extra;Nota')
    expect(contenido).toContain(';Jornada;09:00;17:30;8:30;;0:00;8:30;Olvidé fichar')
})
