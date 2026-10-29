import { fechaLocal } from './schedule'
import type { HorarioDia } from './schedule'

// Cuándo se pide una idea en Hoy al terminar la jornada: el primer y el último
// día laborable de la semana según el horario base (dos veces por semana).

// La semana empieza el lunes (Date.getDay(): 0 = domingo … 6 = sábado)
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]
// Sin horario: lunes y viernes
const POR_DEFECTO = [1, 5]

export function diasDePedirIdea(horariosPorDia: (HorarioDia | null)[]): number[] {
    const laborables = ORDEN_SEMANA.filter((dia) => horariosPorDia[dia]?.activo)
    if (laborables.length === 0) return POR_DEFECTO
    const primero = laborables[0]
    const ultimo = laborables[laborables.length - 1]
    return primero === ultimo ? [primero] : [primero, ultimo]
}

// `cerradaEl`: fecha ("YYYY-MM-DD") en la que se cerró con la ✕ o se envió una idea
export function tocaPedirIdea(hoy: Date, horariosPorDia: (HorarioDia | null)[], cerradaEl: string | null): boolean {
    return diasDePedirIdea(horariosPorDia).includes(hoy.getDay()) && cerradaEl !== fechaLocal(hoy)
}

// Se recuerda en este dispositivo (es solo para no repetir el aviso; si se pierde, no pasa nada)
const clave = (userId: string) => `tempomio-idea-cerrada:${userId}`

export function leerIdeaCerrada(userId: string): string | null {
    try {
        return localStorage.getItem(clave(userId))
    } catch {
        return null
    }
}

export function guardarIdeaCerrada(userId: string, fecha: string = fechaLocal(new Date())) {
    try {
        localStorage.setItem(clave(userId), fecha)
    } catch {
        // Modo privado o almacenamiento bloqueado: el aviso podrá volver a salir hoy
    }
}
