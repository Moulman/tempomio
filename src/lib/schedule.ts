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

// ---------- Fechas (hora local, nunca UTC) ----------

// Date → "YYYY-MM-DD" usando la zona horaria local
export function fechaLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Lunes (YYYY-MM-DD) de la semana de una fecha
export function lunesDeSemana(d: Date): string {
    const lunes = new Date(d)
    lunes.setDate(d.getDate() - (d.getDay() + 6) % 7)
    return fechaLocal(lunes)
}

// "YYYY-MM-DD" + n días (n puede ser negativo)
export function sumarDias(fecha: string, n: number): string {
    const d = new Date(fecha + 'T00:00:00')
    d.setDate(d.getDate() + n)
    return fechaLocal(d)
}

// Las 7 fechas de lunes a domingo de la semana que empieza en `lunes`
export function diasDeSemana(lunes: string): string[] {
    return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
}

// "Martes, 20 de octubre": solo la primera letra en mayúscula
export function fechaLarga(d: Date): string {
    const texto = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// ---------- Racha ----------

// Días consecutivos con fichaje contando hacia atrás desde hoy.
// Si hoy aún no hay fichaje, la racha de ayer se mantiene hasta que acabe el día.
export function calcularRacha(fechasConFichaje: Iterable<string>, hoy: Date = new Date()): number {
    const fechas = new Set(fechasConFichaje)
    const cursor = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    if (!fechas.has(fechaLocal(cursor))) cursor.setDate(cursor.getDate() - 1)

    let racha = 0
    while (fechas.has(fechaLocal(cursor))) {
        racha++
        cursor.setDate(cursor.getDate() - 1)
    }
    return racha
}

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

// Segundos desde una hora "HH:MM" o "HH:MM:SS" de hoy hasta `ahora` (nunca negativo)
export function segundosDesde(hora: string, ahora: Date): number {
    const [h, m, s = 0] = hora.split(':').map(Number)
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, m, s)
    return Math.max(0, Math.floor((ahora.getTime() - inicio.getTime()) / 1000))
}

// 3725 → "01:02:05"
export function formatReloj(segundos: number): string {
    const h = Math.floor(segundos / 3600)
    const m = Math.floor((segundos % 3600) / 60)
    const s = segundos % 60
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

// Duración sin signo: 450 → "7h 30min"
export function formatDuracion(mins: number): string {
    const abs = Math.abs(mins)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
}

// Diferencia con signo: 15 → "+15min", -90 → "-1h 30min", 0 → "0min"
export function formatMinutos(mins: number): string {
    if (mins === 0) return '0min'
    return `${mins < 0 ? '-' : '+'}${formatDuracion(mins)}`
}

// ---------- Calendario ----------

// Genera las celdas de un calendario mensual (incluye huecos al principio
// para alinear con el día de la semana). Devuelve un array donde cada celda
// es una fecha "YYYY-MM-DD" o null (hueco).
export function generarCalendario(anio: number, mes: number): (string | null)[] {
    // mes: 0-11 (enero = 0)
    const primerDia = new Date(anio, mes, 1)
    const ultimoDia = new Date(anio, mes + 1, 0)
    const diasEnMes = ultimoDia.getDate()

    // Día de la semana del primer día, con lunes = 0
    const offset = (primerDia.getDay() + 6) % 7

    const celdas: (string | null)[] = []
    // Huecos antes del día 1
    for (let i = 0; i < offset; i++) celdas.push(null)
    // Los días del mes
    for (let d = 1; d <= diasEnMes; d++) {
        const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        celdas.push(fecha)
    }
    return celdas
}