import { describe, expect, it } from 'vitest'
import { csvDelMes } from './csv'
import type { Fichaje, HorarioDia } from './schedule'

// Lunes a viernes de 9:00 a 17:00 (8h). Índice = getDay(): 0 = domingo
const laborable: HorarioDia = { hora_entrada: '09:00', hora_salida: '17:00', activo: true }
const horarios: (HorarioDia | null)[] = [null, laborable, laborable, laborable, laborable, laborable, null]

const CABECERA = 'Fecha;Día;Entrada;Salida;Trabajado;Bolsa usada;Previsto;Extra;Nota'

function dia(fecha: string, entrada: string | null, salida: string | null, extras: Partial<Fichaje> = {}): Fichaje {
    return { fecha, hora_entrada: entrada, hora_salida: salida, ...extras }
}

// Filas del CSV sin el BOM ni la línea vacía final
function filas(csv: string): string[] {
    return csv.replace(/^\uFEFF/, '').split('\r\n').slice(0, -1)
}

describe('csvDelMes: formato para Excel en español', () => {
    it('empieza con BOM para que Excel lea bien los acentos', () => {
        expect(csvDelMes([], horarios).startsWith('\uFEFF')).toBe(true)
    })

    it('usa saltos de línea CRLF y termina con uno', () => {
        const csv = csvDelMes([], horarios)
        expect(csv.endsWith('\r\n')).toBe(true)
        expect(csv.replace(/\r\n/g, '')).not.toContain('\n')
    })

    it('la primera fila es la cabecera, separada por punto y coma', () => {
        expect(filas(csvDelMes([], horarios))[0]).toBe(CABECERA)
    })

    it('un mes vacío tiene cabecera y una fila de totales a cero', () => {
        expect(filas(csvDelMes([], horarios))).toEqual([CABECERA, 'Total;;;;0:00;0:00;0:00;0:00;'])
    })
})

describe('csvDelMes: filas de cada día', () => {
    it('un día completo muestra fecha, día, horas, trabajado, previsto y extra', () => {
        const csv = csvDelMes([dia('2026-10-01', '09:00:12', '18:30:00')], horarios) // jueves
        expect(filas(csv)[1]).toBe('01/10/2026;jueves;09:00;18:30;9:30;;8:00;1:30;')
    })

    it('un día por debajo del horario muestra el extra negativo', () => {
        const csv = csvDelMes([dia('2026-10-02', '09:00', '16:30')], horarios) // viernes
        expect(filas(csv)[1]).toBe('02/10/2026;viernes;09:00;16:30;7:30;;8:00;-0:30;')
    })

    it('un fin de semana sin horario cuenta todo como extra', () => {
        const csv = csvDelMes([dia('2026-10-03', '10:00', '12:00')], horarios) // sábado
        expect(filas(csv)[1]).toBe('03/10/2026;sábado;10:00;12:00;2:00;;0:00;2:00;')
    })

    it('un día sin salida deja vacíos trabajado y extra', () => {
        const csv = csvDelMes([dia('2026-10-05', '09:00', null)], horarios) // lunes
        expect(filas(csv)[1]).toBe('05/10/2026;lunes;09:00;;;;8:00;;')
    })

    it('salir antes usando bolsa muestra las horas de bolsa y deja el extra en 0', () => {
        const csv = csvDelMes([dia('2026-10-06', '09:00', '15:00', { bolsa_minutos: 120 })], horarios) // martes
        expect(filas(csv)[1]).toBe('06/10/2026;martes;09:00;15:00;6:00;2:00;8:00;0:00;')
    })

    it('un día libre con bolsa muestra solo las horas de bolsa', () => {
        const csv = csvDelMes([dia('2026-10-07', null, null, { bolsa_minutos: 480 })], horarios) // miércoles
        expect(filas(csv)[1]).toBe('07/10/2026;miércoles;;;;8:00;8:00;;')
    })

    it('ordena los días por fecha aunque lleguen desordenados', () => {
        const csv = csvDelMes([dia('2026-10-02', '09:00', '17:00'), dia('2026-10-01', '09:00', '17:00')], horarios)
        expect(filas(csv).slice(1, 3).map((f) => f.slice(0, 10))).toEqual(['01/10/2026', '02/10/2026'])
    })
})

describe('csvDelMes: notas con caracteres especiales', () => {
    it('una nota normal va tal cual', () => {
        const csv = csvDelMes([dia('2026-10-01', '09:00', '17:00', { nota: 'Reunión con la jefa' })], horarios)
        expect(filas(csv)[1].endsWith(';Reunión con la jefa')).toBe(true)
    })

    it('una nota con punto y coma va entre comillas para no romper las columnas', () => {
        const csv = csvDelMes([dia('2026-10-01', '09:00', '17:00', { nota: 'Turno largo; cubrí a Ana' })], horarios)
        expect(filas(csv)[1].endsWith(';"Turno largo; cubrí a Ana"')).toBe(true)
    })

    it('las comillas de una nota se duplican, como pide el formato CSV', () => {
        const csv = csvDelMes([dia('2026-10-01', '09:00', '17:00', { nota: 'Dijo "ok"' })], horarios)
        expect(filas(csv)[1].endsWith(';"Dijo ""ok"""')).toBe(true)
    })

    it('una nota con salto de línea va entre comillas y no parte la fila', () => {
        const csv = csvDelMes([dia('2026-10-01', '09:00', '17:00', { nota: 'Línea 1\nLínea 2' })], horarios)
        expect(filas(csv)).toHaveLength(3) // cabecera, el día y el total
        expect(filas(csv)[1].endsWith(';"Línea 1\nLínea 2"')).toBe(true)
    })

    // Una nota que empieza por =, +, - o @ Excel la puede ejecutar como fórmula
    // ("CSV injection"). El riesgo aquí es bajo porque cada persona solo exporta
    // sus propias notas, pero el CSV se envía a otras personas. Pendiente de decidir.
    it.todo('una nota que empieza por = no se interpreta como fórmula en Excel')
})

describe('csvDelMes: fila de totales', () => {
    it('suma trabajado, bolsa, previsto y extra de los días completos', () => {
        const csv = csvDelMes(
            [
                dia('2026-10-01', '09:00', '18:00'), // 9h, +1h
                dia('2026-10-02', '09:00', '16:30'), // 7:30, -0:30
                dia('2026-10-06', '09:00', '15:00', { bolsa_minutos: 120 }), // 6h + 2h bolsa, 0
            ],
            horarios,
        )
        expect(filas(csv).at(-1)).toBe('Total;;;;22:30;2:00;24:00;0:30;')
    })

    // Comportamiento actual, documentado: los días incompletos muestran su
    // "Previsto" en la fila, pero no entran en el total previsto. Así el total de
    // esa columna no coincide con la suma que haría Excel. Pendiente de decidir.
    it('el total previsto solo suma los días completos', () => {
        const csv = csvDelMes(
            [dia('2026-10-01', '09:00', '17:00'), dia('2026-10-07', null, null, { bolsa_minutos: 480 })],
            horarios,
        )
        expect(filas(csv).at(-1)).toBe('Total;;;;8:00;8:00;8:00;0:00;')
    })
})
