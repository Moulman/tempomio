import { describe, expect, it } from 'vitest'
import { planDeshacer, textoAviso } from './deshacer'
import type { Fichaje } from './schedule'

const HOY = '2026-10-29'

describe('planDeshacer: qué guardar para volver a como estaba antes de fichar', () => {
    it('si antes no había nada guardado ese día, se borra la fila recién creada', () => {
        const actual: Fichaje = { fecha: HOY, hora_entrada: '09:02:10', hora_salida: null }
        expect(planDeshacer(null, actual)).toEqual({ tipo: 'borrar' })
    })

    it('si no había fila pero ya se ha escrito una nota, no se borra: se quitan solo las horas', () => {
        const actual: Fichaje = { fecha: HOY, hora_entrada: '09:02:10', hora_salida: null, nota: 'Reunión a las 12' }
        expect(planDeshacer(null, actual)).toEqual({
            tipo: 'restaurar',
            campos: { hora_entrada: null, hora_salida: null, bolsa_minutos: null },
        })
    })

    it('deshacer la salida vuelve al turno abierto con la misma hora de entrada', () => {
        const anterior: Fichaje = { fecha: HOY, hora_entrada: '09:02:10', hora_salida: null }
        const actual: Fichaje = { fecha: HOY, hora_entrada: '09:02:10', hora_salida: '17:15:00' }
        expect(planDeshacer(anterior, actual)).toEqual({
            tipo: 'restaurar',
            campos: { hora_entrada: '09:02:10', hora_salida: null, bolsa_minutos: null },
        })
    })

    it('deshacer una salida que usó la bolsa devuelve esas horas a la bolsa', () => {
        const anterior: Fichaje = { fecha: HOY, hora_entrada: '09:00:00', hora_salida: null, bolsa_minutos: null }
        const actual: Fichaje = { fecha: HOY, hora_entrada: '09:00:00', hora_salida: '15:00:00', bolsa_minutos: 120 }
        expect(planDeshacer(anterior, actual)).toEqual({
            tipo: 'restaurar',
            campos: { hora_entrada: '09:00:00', hora_salida: null, bolsa_minutos: null },
        })
    })

    it('si ya había horas de bolsa ese día, se conservan', () => {
        const anterior: Fichaje = { fecha: HOY, hora_entrada: null, hora_salida: null, bolsa_minutos: 60 }
        const actual: Fichaje = { fecha: HOY, hora_entrada: '10:00:00', hora_salida: null, bolsa_minutos: 60 }
        expect(planDeshacer(anterior, actual)).toEqual({
            tipo: 'restaurar',
            campos: { hora_entrada: null, hora_salida: null, bolsa_minutos: 60 },
        })
    })

    it('nunca toca la nota', () => {
        const anterior: Fichaje = { fecha: HOY, hora_entrada: null, hora_salida: null, nota: 'Antes' }
        const actual: Fichaje = { fecha: HOY, hora_entrada: '09:00:00', hora_salida: null, nota: 'Después' }
        const plan = planDeshacer(anterior, actual)
        expect(plan.tipo).toBe('restaurar')
        if (plan.tipo === 'restaurar') expect(plan.campos).not.toHaveProperty('nota')
    })
})

describe('textoAviso', () => {
    it('muestra la hora sin segundos', () => {
        expect(textoAviso('entrada', '09:02:10')).toBe('Entrada marcada a las 09:02')
        expect(textoAviso('salida', '17:15:00')).toBe('Salida marcada a las 17:15')
    })
})
