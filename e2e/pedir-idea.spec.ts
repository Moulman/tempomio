import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { completarBienvenida, crearUsuaria, iniciarSesion } from './ayudas'

// Sin horario base, la idea se pide los lunes y los viernes al terminar la jornada.
// El reloj del navegador se fija en un día concreto para que el test no dependa de hoy.
const LUNES = new Date('2026-10-26T18:00:00+01:00')
const MARTES = new Date('2026-10-27T18:00:00+01:00')
const VIERNES = new Date('2026-10-30T18:00:00+01:00')

async function terminarJornada(page: Page, dia: Date, nombre: string) {
    await page.clock.install({ time: dia })
    const email = await crearUsuaria()
    await iniciarSesion(page, email)
    await completarBienvenida(page, nombre)
    await page.getByRole('button', { name: 'Marcar entrada' }).click()
    await expect(page.getByText('En turno').first()).toBeVisible()
    await page.getByRole('button', { name: 'Marcar salida' }).first().click()
    await expect(page.getByText('Jornada terminada')).toBeVisible()
    // Se adelanta el reloj para que se vaya el aviso de «Deshacer»
    await page.clock.runFor(10_000)
    await expect(page.getByRole('button', { name: 'Deshacer' })).toHaveCount(0)
}

test('el lunes, al terminar la jornada, se pide una idea y lleva al formulario', async ({ page }) => {
    await terminarJornada(page, LUNES, 'Paula')

    await expect(page.getByText('¿Qué mejorarías de TempoMio?')).toBeVisible()
    await page.getByRole('link', { name: 'Contar una idea →' }).click()

    await expect(page.getByRole('heading', { name: 'Ideas', exact: true })).toBeVisible()
    await page.getByLabel('Tu idea').fill('Poder exportar en PDF')
    await page.getByRole('button', { name: 'Enviar idea' }).click()
    await expect(page.getByText('¡Recibido!')).toBeVisible()

    // Ya ha contado una idea hoy: en Hoy no se vuelve a pedir
    await page.goto('/')
    await expect(page.getByText('Jornada terminada')).toBeVisible()
    await expect(page.getByText('¿Qué mejorarías de TempoMio?')).toHaveCount(0)
})

test('el viernes se puede cerrar con la ✕ y no vuelve a salir ese día', async ({ page }) => {
    await terminarJornada(page, VIERNES, 'Elena')

    await expect(page.getByText('¿Qué mejorarías de TempoMio?')).toBeVisible()
    await page.getByRole('button', { name: 'No mostrar hoy' }).click()
    await expect(page.getByText('¿Qué mejorarías de TempoMio?')).toHaveCount(0)

    await page.reload()
    await expect(page.getByText('Jornada terminada')).toBeVisible()
    await expect(page.getByText('¿Qué mejorarías de TempoMio?')).toHaveCount(0)
})

test('el martes no se pide ninguna idea', async ({ page }) => {
    await terminarJornada(page, MARTES, 'Sara')
    await expect(page.getByText('¿Qué mejorarías de TempoMio?')).toHaveCount(0)
})
