import { describe, expect, it } from 'vitest'
import { diasDePedirIdea, tocaPedirIdea } from './pedirIdea'
import type { HorarioDia } from './schedule'

// horariosPorDia va de domingo (0) a sábado (6), como Date.getDay()
const trabajo: HorarioDia = { hora_entrada: '09:00', hora_salida: '17:00', activo: true }
function semana(dias: number[]): (HorarioDia | null)[] {
    return Array.from({ length: 7 }, (_, d) => (dias.includes(d) ? trabajo : null))
}

// Fechas de la semana del 26 de octubre de 2026 (lunes 26 … domingo 1 de noviembre)
const LUNES = new Date(2026, 9, 26, 18, 0)
const MARTES = new Date(2026, 9, 27, 18, 0)
const MIERCOLES = new Date(2026, 9, 28, 18, 0)
const VIERNES = new Date(2026, 9, 30, 18, 0)
const DOMINGO = new Date(2026, 10, 1, 18, 0)

describe('diasDePedirIdea: primer y último día laborable de la semana', () => {
    it('de lunes a viernes: lunes y viernes', () => {
        expect(diasDePedirIdea(semana([1, 2, 3, 4, 5]))).toEqual([1, 5])
    })

    it('la semana empieza el lunes: de miércoles a domingo da miércoles y domingo', () => {
        expect(diasDePedirIdea(semana([3, 4, 5, 6, 0]))).toEqual([3, 0])
    })

    it('si libra el lunes, el primero es el martes', () => {
        expect(diasDePedirIdea(semana([2, 3, 4, 5]))).toEqual([2, 5])
    })

    it('sin horario: lunes y viernes', () => {
        expect(diasDePedirIdea(semana([]))).toEqual([1, 5])
    })

    it('un día marcado como no activo no cuenta como laborable', () => {
        const horarios = semana([1, 2, 3, 4, 5])
        horarios[5] = { ...trabajo, activo: false }
        expect(diasDePedirIdea(horarios)).toEqual([1, 4])
    })

    it('si solo trabaja un día, ese día', () => {
        expect(diasDePedirIdea(semana([3]))).toEqual([3])
    })
})

describe('tocaPedirIdea', () => {
    const lunesAViernes = semana([1, 2, 3, 4, 5])

    it('sale el lunes y el viernes', () => {
        expect(tocaPedirIdea(LUNES, lunesAViernes, null)).toBe(true)
        expect(tocaPedirIdea(VIERNES, lunesAViernes, null)).toBe(true)
    })

    it('no sale los demás días', () => {
        expect(tocaPedirIdea(MARTES, lunesAViernes, null)).toBe(false)
        expect(tocaPedirIdea(MIERCOLES, lunesAViernes, null)).toBe(false)
        expect(tocaPedirIdea(DOMINGO, lunesAViernes, null)).toBe(false)
    })

    it('si hoy ya se cerró (o se envió una idea), no vuelve a salir', () => {
        expect(tocaPedirIdea(LUNES, lunesAViernes, '2026-10-26')).toBe(false)
    })

    it('cerrarla el lunes no impide que salga el viernes', () => {
        expect(tocaPedirIdea(VIERNES, lunesAViernes, '2026-10-26')).toBe(true)
    })
})
