import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { extraDelDia } from './schedule'
import type { Fichaje, HorarioDia } from './schedule'

// ---------- Tipos ----------

export interface AjusteBolsa {
    id: string
    fecha: string
    minutos: number
    motivo: string | null
    es_inicial: boolean
}

export interface Movimiento {
    clave: string
    fecha: string
    minutos: number
    tipo: 'extra' | 'uso' | 'inicial' | 'ajuste'
    nota?: string | null
    // Uso apuntado para hoy o un día futuro: ya está descontado, pero aún no ha pasado
    previsto?: boolean
    // Solo ajustes (para poder borrarlos)
    ajusteId?: string
}

export interface ResumenBolsa {
    disponible: number
    ganado: number
    // Días que terminaron por debajo del horario sin usar bolsa (negativo)
    debido: number
    usado: number
    ajustado: number
    inicial: AjusteBolsa | null
    movimientos: Movimiento[]
}

// ---------- Cálculo ----------

// Saldo = saldo inicial + ajustes + extra de cada día completo − horas de bolsa usadas.
// Solo cuentan los fichajes desde la fecha del saldo inicial (los anteriores ya
// están dentro de ese saldo). Los días sin fichaje completo no restan, salvo
// las horas de bolsa que se hayan apuntado para ellos.
export function calcularBolsa(
    fichajes: Fichaje[],
    ajustes: AjusteBolsa[],
    horariosPorDia: (HorarioDia | null)[],
    hoy: string,
): ResumenBolsa {
    const inicial = ajustes.find((a) => a.es_inicial) ?? null
    const desde = inicial?.fecha ?? ''
    const movimientos: Movimiento[] = []
    let ganado = 0
    let debido = 0
    let usado = 0
    let ajustado = 0

    for (const f of fichajes) {
        if (f.fecha < desde) continue
        const completo = !!f.hora_entrada && !!f.hora_salida
        const uso = f.bolsa_minutos ?? 0

        if (completo) {
            const extra = extraDelDia(f, horariosPorDia[new Date(f.fecha + 'T00:00:00').getDay()])
            if (extra > 0) ganado += extra
            if (extra < 0) debido += extra
            if (extra !== 0) movimientos.push({ clave: `e-${f.fecha}`, fecha: f.fecha, minutos: extra, tipo: 'extra' })
        }
        if (uso > 0) {
            usado += uso
            movimientos.push({
                clave: `u-${f.fecha}`,
                fecha: f.fecha,
                minutos: -uso,
                tipo: 'uso',
                nota: f.nota,
                previsto: f.fecha > hoy || (f.fecha === hoy && !completo),
            })
        }
    }

    for (const a of ajustes) {
        ajustado += a.minutos
        movimientos.push({
            clave: `a-${a.id}`,
            fecha: a.fecha,
            minutos: a.minutos,
            tipo: a.es_inicial ? 'inicial' : 'ajuste',
            nota: a.motivo,
            ajusteId: a.id,
        })
    }

    // Más recientes primero; en el mismo día, el saldo inicial al final (es el punto de partida)
    movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha) || Number(a.tipo === 'inicial') - Number(b.tipo === 'inicial'))

    return {
        disponible: ajustado + ganado + debido - usado,
        ganado,
        debido,
        usado,
        ajustado,
        inicial,
        movimientos,
    }
}

// ---------- Datos ----------

// Todos los fichajes y ajustes de la persona (pocos usuarios y un registro por
// día: unos cientos de filas como mucho). Se recarga cuando cambia `recarga`.
export function useBolsa(userId: string | null, recarga: number) {
    const [fichajes, setFichajes] = useState<Fichaje[]>([])
    const [ajustes, setAjustes] = useState<AjusteBolsa[]>([])
    const [cargado, setCargado] = useState(false)
    const [error, setError] = useState(false)
    const [recargaPropia, setRecargaPropia] = useState(0)

    useEffect(() => {
        if (!userId) return
        let cancelado = false
        const leerFichajes = (columnas: string) => supabase
            .from('fichajes')
            .select(columnas)
            .eq('user_id', userId)
            .order('fecha')
            .returns<Fichaje[]>()

        async function cargar() {
            const [conBolsa, a] = await Promise.all([
                leerFichajes('fecha, hora_entrada, hora_salida, nota, bolsa_minutos'),
                supabase
                    .from('ajustes_bolsa')
                    .select('id, fecha, minutos, motivo, es_inicial')
                    .eq('user_id', userId)
                    .order('fecha'),
            ])
            // Sin la migración de la bolsa aplicada, la columna no existe: se leen
            // los fichajes sin ella y la bolsa queda oculta (error) sin romper lo demás
            const f = conBolsa.error ? await leerFichajes('fecha, hora_entrada, hora_salida, nota') : conBolsa
            if (cancelado) return
            setError(!!(conBolsa.error || a.error))
            setFichajes(f.data || [])
            setAjustes(a.data || [])
            setCargado(true)
        }

        cargar()
        return () => { cancelado = true }
    }, [userId, recarga, recargaPropia])

    function recargar() {
        setRecargaPropia((n) => n + 1)
    }

    // Saldo inicial: crea o reemplaza el único de la persona
    async function guardarInicial(minutos: number, fecha: string): Promise<boolean> {
        const actual = ajustes.find((a) => a.es_inicial)
        const { error } = actual
            ? await supabase.from('ajustes_bolsa').update({ minutos, fecha }).eq('id', actual.id)
            : await supabase.from('ajustes_bolsa').insert({ user_id: userId, minutos, fecha, es_inicial: true, motivo: null })
        if (!error) recargar()
        return !error
    }

    async function anadirAjuste(minutos: number, motivo: string | null, fecha: string): Promise<boolean> {
        const { error } = await supabase.from('ajustes_bolsa').insert({ user_id: userId, minutos, motivo, fecha })
        if (!error) recargar()
        return !error
    }

    async function borrarAjuste(id: string): Promise<boolean> {
        const { error } = await supabase.from('ajustes_bolsa').delete().eq('id', id)
        if (!error) recargar()
        return !error
    }

    // Apunta horas de bolsa para un día (salir antes o día libre). Si se da una
    // nota y el día no tenía, se guarda como nota del día.
    async function usarBolsa(fecha: string, minutos: number, nota: string | null): Promise<boolean> {
        const existente = fichajes.find((f) => f.fecha === fecha)
        const fila: Record<string, unknown> = { user_id: userId, fecha, bolsa_minutos: minutos }
        if (nota && !existente?.nota) fila.nota = nota
        const { error } = await supabase.from('fichajes').upsert(fila, { onConflict: 'user_id,fecha' })
        if (!error) recargar()
        return !error
    }

    return { fichajes, ajustes, cargado, error, recargar, guardarInicial, anadirAjuste, borrarAjuste, usarBolsa }
}

export type Bolsa = ReturnType<typeof useBolsa>

// Horas y minutos escritos en dos campos → minutos totales (null si no son válidos)
export function leerHoras(horas: string, minutos: string): number | null {
    const h = horas.trim() === '' ? 0 : Number(horas)
    const m = minutos.trim() === '' ? 0 : Number(minutos)
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || m > 59) return null
    return h * 60 + m
}
