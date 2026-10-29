import type { Fichaje } from './schedule'

// «Deshacer» justo después de marcar entrada o salida, por si se pulsó sin querer

export type AccionFichaje = 'entrada' | 'salida'

export type PlanDeshacer =
    | { tipo: 'borrar' }
    | { tipo: 'restaurar'; campos: { hora_entrada: string | null; hora_salida: string | null; bolsa_minutos: number | null } }

// Segundos que se ve el aviso con el botón «Deshacer»
export const SEGUNDOS_AVISO = 8

// Qué guardar para volver a como estaba el día antes de fichar.
// `anterior` es el fichaje de hoy justo antes de pulsar (null si no había fila)
// y `actual` el que hay ahora. La nota nunca se toca.
export function planDeshacer(anterior: Fichaje | null, actual: Fichaje | null): PlanDeshacer {
    if (!anterior) {
        // La fila la ha creado el propio fichaje: se borra, salvo que ya tenga una nota
        return actual?.nota
            ? { tipo: 'restaurar', campos: { hora_entrada: null, hora_salida: null, bolsa_minutos: null } }
            : { tipo: 'borrar' }
    }
    return {
        tipo: 'restaurar',
        campos: {
            hora_entrada: anterior.hora_entrada ?? null,
            hora_salida: anterior.hora_salida ?? null,
            bolsa_minutos: anterior.bolsa_minutos ?? null,
        },
    }
}

export function textoAviso(accion: AccionFichaje, hora: string): string {
    return `${accion === 'entrada' ? 'Entrada' : 'Salida'} marcada a las ${hora.slice(0, 5)}`
}
