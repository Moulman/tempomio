import { describe, expect, it, vi } from 'vitest'
import { calcularBolsa, leerHoras } from './bolsa'
import type { AjusteBolsa } from './bolsa'
import type { Fichaje, HorarioDia } from './schedule'

// bolsa.ts importa el cliente de Supabase; en tests unitarios no se usa
vi.mock('../supabaseClient', () => ({ supabase: {} }))

// Horario de lunes a viernes, 9:00 a 17:00 (8h). Índice = getDay(): 0 = domingo
const laborable: HorarioDia = { hora_entrada: '09:00', hora_salida: '17:00', activo: true }
const horarios: (HorarioDia | null)[] = [null, laborable, laborable, laborable, laborable, laborable, null]

const HOY = '2026-10-28'

function dia(fecha: string, entrada: string | null, salida: string | null, bolsa: number | null = null): Fichaje {
    return { fecha, hora_entrada: entrada, hora_salida: salida, bolsa_minutos: bolsa }
}

function ajuste(id: string, fecha: string, minutos: number, es_inicial = false): AjusteBolsa {
    return { id, fecha, minutos, motivo: null, es_inicial }
}

const saldoInicial = ajuste('ini', '2026-10-01', 600, true) // 10h desde el jueves 1 de octubre

describe('calcularBolsa', () => {
    it('sin datos, el saldo es 0', () => {
        const r = calcularBolsa([], [], horarios, HOY)
        expect(r.disponible).toBe(0)
        expect(r.inicial).toBeNull()
        expect(r.movimientos).toEqual([])
    })

    it('el saldo inicial cuenta desde el principio', () => {
        const r = calcularBolsa([], [saldoInicial], horarios, HOY)
        expect(r.disponible).toBe(600)
        expect(r.inicial?.id).toBe('ini')
        expect(r.movimientos[0].tipo).toBe('inicial')
    })

    it('los fichajes anteriores a la fecha del saldo inicial no cuentan', () => {
        const r = calcularBolsa(
            [
                dia('2026-09-30', '09:00', '19:00'), // +2h, pero ya está dentro del saldo inicial
                dia('2026-10-01', '09:00', '18:00'), // +1h
            ],
            [saldoInicial], horarios, HOY,
        )
        expect(r.ganado).toBe(60)
        expect(r.disponible).toBe(660)
    })

    it('un día por debajo del horario resta', () => {
        const r = calcularBolsa([dia('2026-10-02', '09:00', '16:00')], [saldoInicial], horarios, HOY)
        expect(r.debido).toBe(-60)
        expect(r.disponible).toBe(540)
    })

    it('un día sin salida no resta ni suma', () => {
        const r = calcularBolsa([dia('2026-10-02', '09:00', null)], [saldoInicial], horarios, HOY)
        expect(r.disponible).toBe(600)
        expect(r.movimientos.filter((m) => m.tipo === 'extra')).toHaveLength(0)
    })

    it('trabajar en un día sin horario suma todo como extra', () => {
        const r = calcularBolsa([dia('2026-10-03', '10:00', '12:00')], [saldoInicial], horarios, HOY) // sábado
        expect(r.ganado).toBe(120)
        expect(r.disponible).toBe(720)
    })

    it('salir antes usando bolsa descuenta solo las horas usadas', () => {
        // Lunes: 9:00 a 15:00 y 2h de bolsa → el día queda en 0 y se gastan 2h
        const r = calcularBolsa([dia('2026-10-05', '09:00', '15:00', 120)], [saldoInicial], horarios, HOY)
        expect(r.usado).toBe(120)
        expect(r.debido).toBe(0)
        expect(r.disponible).toBe(480)
        const uso = r.movimientos.find((m) => m.tipo === 'uso')
        expect(uso?.minutos).toBe(-120)
        expect(uso?.previsto).toBe(false)
    })

    it('un día libre con bolsa descuenta las horas aunque no haya fichaje', () => {
        const r = calcularBolsa([dia('2026-10-06', null, null, 480)], [saldoInicial], horarios, HOY)
        expect(r.usado).toBe(480)
        expect(r.disponible).toBe(120)
    })

    it('un uso futuro o de hoy sin terminar se descuenta y queda como previsto', () => {
        const r = calcularBolsa(
            [
                dia('2026-11-02', null, null, 480), // futuro
                dia(HOY, '09:00', null, 60), // hoy, turno sin cerrar
            ],
            [saldoInicial], horarios, HOY,
        )
        expect(r.disponible).toBe(600 - 480 - 60)
        const usos = r.movimientos.filter((m) => m.tipo === 'uso')
        expect(usos).toHaveLength(2)
        expect(usos.every((m) => m.previsto)).toBe(true)
    })

    it('los ajustes manuales suman y restan', () => {
        const r = calcularBolsa([], [saldoInicial, ajuste('a1', '2026-10-10', 30), ajuste('a2', '2026-10-12', -45)], horarios, HOY)
        expect(r.ajustado).toBe(600 + 30 - 45)
        expect(r.disponible).toBe(585)
    })

    it('sin saldo inicial cuentan todos los fichajes', () => {
        const r = calcularBolsa([dia('2026-09-30', '09:00', '18:00')], [], horarios, HOY)
        expect(r.disponible).toBe(60)
    })

    it('los movimientos van del más reciente al más antiguo, con el saldo inicial al final de su día', () => {
        const r = calcularBolsa(
            [dia('2026-10-01', '09:00', '18:00'), dia('2026-10-02', '09:00', '18:00')],
            [saldoInicial], horarios, HOY,
        )
        expect(r.movimientos.map((m) => `${m.fecha} ${m.tipo}`)).toEqual([
            '2026-10-02 extra',
            '2026-10-01 extra',
            '2026-10-01 inicial',
        ])
    })
})

describe('leerHoras', () => {
    it('convierte horas y minutos a minutos', () => {
        expect(leerHoras('2', '30')).toBe(150)
        expect(leerHoras('', '45')).toBe(45)
        expect(leerHoras('3', '')).toBe(180)
    })

    it('rechaza valores no válidos', () => {
        expect(leerHoras('-1', '0')).toBeNull()
        expect(leerHoras('1', '60')).toBeNull()
        expect(leerHoras('1.5', '0')).toBeNull()
        expect(leerHoras('abc', '0')).toBeNull()
    })
})
