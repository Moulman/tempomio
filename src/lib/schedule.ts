// Resultado de agrupar: una semana con su total de extra
export interface ResumenSemana {
    semanaInicio: string   // lunes de esa semana, "2026-09-15"
    extraMinutos: number
}

export interface ResumenMes {
    mes: string            // "2026-09"
    extraMinutos: number
}

// horariosPorDia: un array de 7 posiciones (0=domingo ... 6=sábado)
type HorariosPorDia = (HorarioDia | null)[]

// Agrupa los fichajes por semana (lunes-domingo) y suma el extra de cada una
export function agruparPorSemana(
    fichajes: Fichaje[],
    horariosPorDia: HorariosPorDia
): ResumenSemana[] {
    const grupos: Record<string, number> = {}

    for (const f of fichajes) {
        const fecha = new Date(f.fecha + 'T00:00:00')
        // Calculamos el lunes de esa semana
        const diaSemana = (fecha.getDay() + 6) % 7  // convierte domingo=0 en lunes=0
        const lunes = new Date(fecha)
        lunes.setDate(fecha.getDate() - diaSemana)
        const clave = lunes.toISOString().slice(0, 10)

        const horario = horariosPorDia[fecha.getDay()]
        const extra = extraDelDia(f, horario)

        grupos[clave] = (grupos[clave] || 0) + extra
    }

    return Object.entries(grupos)
        .map(([semanaInicio, extraMinutos]) => ({ semanaInicio, extraMinutos }))
        .sort((a, b) => b.semanaInicio.localeCompare(a.semanaInicio))  // más reciente primero
}

// Agrupa los fichajes por mes y suma el extra
export function agruparPorMes(
    fichajes: Fichaje[],
    horariosPorDia: HorariosPorDia
): ResumenMes[] {
    const grupos: Record<string, number> = {}

    for (const f of fichajes) {
        const fecha = new Date(f.fecha + 'T00:00:00')
        const clave = f.fecha.slice(0, 7)  // "2026-09"

        const horario = horariosPorDia[fecha.getDay()]
        const extra = extraDelDia(f, horario)

        grupos[clave] = (grupos[clave] || 0) + extra
    }

    return Object.entries(grupos)
        .map(([mes, extraMinutos]) => ({ mes, extraMinutos }))
        .sort((a, b) => b.mes.localeCompare(a.mes))
}