import { describe, expect, it } from 'vitest'
import {
    calcularRacha,
    diasDeSemana,
    extraDelDia,
    fechaLocal,
    formatDuracion,
    formatMinutos,
    formatReloj,
    generarCalendario,
    lunesDeSemana,
    minutosTrabajados,
    segundosDesde,
    sumarDias,
} from './schedule'
import type { Fichaje, HorarioDia } from './schedule'

const horario9a17: HorarioDia = { hora_entrada: '09:00', hora_salida: '17:00', activo: true }

function fichaje(entrada: string | null, salida: string | null, bolsa: number | null = null): Fichaje {
    return { fecha: '2026-10-28', hora_entrada: entrada, hora_salida: salida, bolsa_minutos: bolsa }
}

describe('zona horaria de los tests', () => {
    it('se ejecutan en hora de Madrid (script npm test)', () => {
        expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Madrid')
    })
})

describe('minutosTrabajados', () => {
    it('cuenta un turno normal', () => {
        expect(minutosTrabajados('09:00', '17:00')).toBe(480)
    })

    it('ignora los segundos del cronómetro', () => {
        expect(minutosTrabajados('09:00:45', '17:00:10')).toBe(480)
    })

    it('cuenta un turno que cruza la medianoche', () => {
        expect(minutosTrabajados('22:00', '06:00')).toBe(480)
    })

    it('devuelve 0 si falta la entrada o la salida', () => {
        expect(minutosTrabajados(null, '17:00')).toBe(0)
        expect(minutosTrabajados('09:00', null)).toBe(0)
    })

    it('devuelve 0 si entrada y salida son iguales', () => {
        expect(minutosTrabajados('09:00', '09:00')).toBe(0)
    })

    // Hoy se calcula con horas de reloj. La noche del cambio de hora (25 oct 2026,
    // a las 3:00 vuelven a ser las 2:00) un turno de 22:00 a 06:00 dura 9h reales,
    // pero sale 8h. Hay que decidir si se cuenta tiempo real antes de cambiarlo.
    it.todo('turno de noche en el cambio de hora de octubre cuenta 9h reales')
})

describe('extraDelDia', () => {
    it('un día completo por encima del horario da extra positivo', () => {
        expect(extraDelDia(fichaje('09:00', '18:00'), horario9a17)).toBe(60)
    })

    it('un día por debajo del horario da extra negativo', () => {
        expect(extraDelDia(fichaje('09:00', '16:30'), horario9a17)).toBe(-30)
    })

    it('un día incompleto no cuenta, aunque tenga bolsa apuntada', () => {
        expect(extraDelDia(fichaje('09:00', null, 120), horario9a17)).toBe(0)
    })

    it('las horas de bolsa usadas cuentan como trabajadas', () => {
        // Sale 2h antes y usa 2h de bolsa: el día queda en 0
        expect(extraDelDia(fichaje('09:00', '15:00', 120), horario9a17)).toBe(0)
    })

    it('sin horario ese día, todo cuenta como extra', () => {
        expect(extraDelDia(fichaje('10:00', '12:00'), null)).toBe(120)
    })

    it('con el horario desactivado, todo cuenta como extra', () => {
        expect(extraDelDia(fichaje('10:00', '12:00'), { ...horario9a17, activo: false })).toBe(120)
    })
})

describe('fechas en hora local', () => {
    it('fechaLocal da el día de España justo después de medianoche (bug de UTC)', () => {
        const recienPasadaMedianoche = new Date(2026, 9, 28, 0, 30)
        expect(fechaLocal(recienPasadaMedianoche)).toBe('2026-10-28')
        // Por esto no se usa toISOString: en UTC todavía es el día anterior
        expect(recienPasadaMedianoche.toISOString().slice(0, 10)).toBe('2026-10-27')
    })

    it('lunesDeSemana devuelve el lunes de esa semana', () => {
        expect(lunesDeSemana(new Date(2026, 9, 28))).toBe('2026-10-26') // miércoles
        expect(lunesDeSemana(new Date(2026, 10, 1))).toBe('2026-10-26') // domingo
        expect(lunesDeSemana(new Date(2026, 9, 26))).toBe('2026-10-26') // el propio lunes
    })

    it('sumarDias cruza el cambio de hora, meses y años', () => {
        expect(sumarDias('2026-10-24', 2)).toBe('2026-10-26')
        expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
        expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28')
    })

    it('diasDeSemana devuelve de lunes a domingo', () => {
        const dias = diasDeSemana('2026-10-26')
        expect(dias).toHaveLength(7)
        expect(dias[0]).toBe('2026-10-26')
        expect(dias[6]).toBe('2026-11-01')
    })
})

describe('formatos', () => {
    it('formatMinutos muestra el signo', () => {
        expect(formatMinutos(0)).toBe('0min')
        expect(formatMinutos(15)).toBe('+15min')
        expect(formatMinutos(-90)).toBe('-1h 30min')
        expect(formatMinutos(120)).toBe('+2h')
    })

    it('formatDuracion no muestra signo', () => {
        expect(formatDuracion(450)).toBe('7h 30min')
        expect(formatDuracion(-45)).toBe('45min')
    })

    it('formatReloj usa HH:MM:SS', () => {
        expect(formatReloj(3725)).toBe('01:02:05')
        expect(formatReloj(0)).toBe('00:00:00')
    })
})

describe('segundosDesde', () => {
    const ahora = new Date(2026, 9, 28, 10, 0, 0)

    it('cuenta los segundos desde la entrada de hoy', () => {
        expect(segundosDesde('09:30', ahora)).toBe(1800)
        expect(segundosDesde('09:59:30', ahora)).toBe(30)
    })

    it('nunca es negativo si la hora es posterior', () => {
        expect(segundosDesde('11:00', ahora)).toBe(0)
    })
})

describe('calcularRacha', () => {
    const hoy = new Date(2026, 9, 28, 12, 0)

    it('cuenta los días seguidos hasta hoy', () => {
        expect(calcularRacha(['2026-10-26', '2026-10-27', '2026-10-28'], hoy)).toBe(3)
    })

    it('si hoy aún no hay fichaje, mantiene la racha de ayer', () => {
        expect(calcularRacha(['2026-10-26', '2026-10-27'], hoy)).toBe(2)
    })

    it('un hueco corta la racha', () => {
        expect(calcularRacha(['2026-10-25', '2026-10-27', '2026-10-28'], hoy)).toBe(2)
    })

    it('sin fichajes recientes es 0', () => {
        expect(calcularRacha(['2026-10-20'], hoy)).toBe(0)
    })
})

describe('generarCalendario', () => {
    it('alinea el día 1 con su día de la semana (lunes primero)', () => {
        const octubre = generarCalendario(2026, 9) // 1 oct 2026 es jueves
        expect(octubre.slice(0, 3)).toEqual([null, null, null])
        expect(octubre[3]).toBe('2026-10-01')
        expect(octubre).toHaveLength(3 + 31)
    })

    it('febrero tiene 28 días, y 29 en año bisiesto', () => {
        expect(generarCalendario(2026, 1).filter(Boolean)).toHaveLength(28)
        expect(generarCalendario(2028, 1).filter(Boolean)).toHaveLength(29)
    })
})
