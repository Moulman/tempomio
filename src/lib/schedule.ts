// ---------- Tipos ----------

export interface Fichaje {
    fecha: string
    hora_entrada: string | null
    hora_salida: string | null
    nota?: string | null
}

export interface HorarioDia {
    hora_entrada: string
    hora_salida: string
    activo: boolean
}

export interface ResumenSemana {
    semanaInicio: string
    extraMinutos: number
}

export interface ResumenMes {
    mes: string
    extraMinutos: number
}

type HorariosPorDia = (HorarioDia | null)[]

// ---------- Cálculo ----------

function aMinutos(hora: string | null): number | null {
    if (!hora) return null
    const [h, m] = hora.split(':').map(Number)
    return h * 60 + m
}

export function minutosTrabajados(entrada: string | null, salida: string | null): number {
    const e = aMinutos(entrada)
    const s = aMinutos(salida)
    if (e === null || s === null) return 0
    return s >= e ? s - e : (24 * 60 - e) + s
}

export function extraDelDia(fichaje: Fichaje, horario: HorarioDia | null): number {
    if (!fichaje.hora_entrada || !fichaje.hora_salida) return 0
    const real = minutosTrabajados(fichaje.hora_entrada, fichaje.hora_salida)
    const teorico = horario && horario.activo
        ? minutosTrabajados(horario.hora_entrada, horario.hora_salida)
        : 0
    return real - teorico
}

export function formatMinutos(mins: number): string {
    const signo = mins < 0 ? '-' : '+'
    const abs = Math.abs(mins)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    if (h === 0) return `${signo}${m}min`
    if (m === 0) return `${signo}${h}h`
    return `${signo}${h}h ${m}min`
}

// ---------- Agrupación ----------

export function agruparPorSemana(
    fichajes: Fichaje[],
    horariosPorDia: HorariosPorDia
): ResumenSemana[] {
    const grupos: Record<string, number> = {}

    for (const f of fichajes) {
        const fecha = new Date(f.fecha + 'T00:00:00')
        const diaSemana = (fecha.getDay() + 6) % 7
        const lunes = new Date(fecha)
        lunes.setDate(fecha.getDate() - diaSemana)
        const clave = lunes.toISOString().slice(0, 10)

        const horario = horariosPorDia[fecha.getDay()]
        const extra = extraDelDia(f, horario)

        grupos[clave] = (grupos[clave] || 0) + extra
    }

    return Object.entries(grupos)
        .map(([semanaInicio, extraMinutos]) => ({ semanaInicio, extraMinutos }))
        .sort((a, b) => b.semanaInicio.localeCompare(a.semanaInicio))
}

export function agruparPorMes(
    fichajes: Fichaje[],
    horariosPorDia: HorariosPorDia
): ResumenMes[] {
    const grupos: Record<string, number> = {}

    for (const f of fichajes) {
        const fecha = new Date(f.fecha + 'T00:00:00')
        const clave = f.fecha.slice(0, 7)

        const horario = horariosPorDia[fecha.getDay()]
        const extra = extraDelDia(f, horario)

        grupos[clave] = (grupos[clave] || 0) + extra
    }

    return Object.entries(grupos)
        .map(([mes, extraMinutos]) => ({ mes, extraMinutos }))
        .sort((a, b) => b.mes.localeCompare(a.mes))
}