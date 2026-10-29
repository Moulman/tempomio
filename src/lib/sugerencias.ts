// Prioridades de la tabla sugerencias (columna prioridad)
export type Prioridad = 'lo_necesito' | 'estaria_guay' | 'bug'

export const PRIORIDADES: { valor: Prioridad; emoji: string; titulo: string }[] = [
    { valor: 'lo_necesito', emoji: '🔥', titulo: 'Lo necesito ya' },
    { valor: 'estaria_guay', emoji: '💡', titulo: 'Estaría guay' },
    { valor: 'bug', emoji: '🐛', titulo: 'Algo no va' },
]

export function etiquetaPrioridad(valor: string): string {
    const p = PRIORIDADES.find((p) => p.valor === valor)
    return p ? `${p.emoji} ${p.titulo}` : valor
}

export const MAX_LONGITUD_IDEA = 2000
