import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fechaLocal } from './schedule'
import type { Fichaje } from './schedule'
import { planDeshacer, SEGUNDOS_AVISO } from './deshacer'
import type { AccionFichaje } from './deshacer'

// Último fichaje marcado, mientras se puede deshacer
export interface AvisoFichaje {
    accion: AccionFichaje
    hora: string
    // Cómo estaba el día justo antes de pulsar (null si no había fila)
    anterior: Fichaje | null
}

function fechaHoy(): string {
    return fechaLocal(new Date()) // "YYYY-MM-DD" en hora local (toISOString daría la fecha UTC)
}

// "HH:MM:SS": con segundos para que el cronómetro sea exacto (los cálculos usan solo HH:MM)
function horaActual(): string {
    return new Date().toTimeString().slice(0, 8)
}

// Fichaje de hoy compartido por toda la app: la página Hoy lo edita y la
// navegación lo usa para mostrar el cronómetro en vivo.
export function useFichajeHoy(userId: string | null) {
    const [fichaje, setFichaje] = useState<Fichaje | null>(null)
    const [cargando, setCargando] = useState(true)
    // Sube con cada cambio guardado (p. ej. para recalcular la racha)
    const [version, setVersion] = useState(0)
    const [recarga, setRecarga] = useState(0)
    const [aviso, setAviso] = useState<AvisoFichaje | null>(null)

    // El aviso con «Deshacer» se va solo a los pocos segundos
    useEffect(() => {
        if (!aviso) return
        const id = setTimeout(() => setAviso(null), SEGUNDOS_AVISO * 1000)
        return () => clearTimeout(id)
    }, [aviso])

    useEffect(() => {
        if (!userId) return
        let cancelado = false
        supabase
            .from('fichajes')
            .select('*')
            .eq('user_id', userId)
            .eq('fecha', fechaHoy())
            .maybeSingle()
            .then(({ data }) => {
                if (cancelado) return
                setFichaje(data)
                setCargando(false)
            })
        return () => { cancelado = true }
    }, [userId, recarga])

    // Aplica el resultado de una escritura; devuelve si fue bien
    function aplicar({ data, error }: { data: Fichaje | null; error: unknown }): boolean {
        if (error) return false
        setFichaje(data)
        setVersion((n) => n + 1)
        return true
    }

    async function marcarEntrada() {
        const anterior = fichaje
        const resultado = await supabase
            .from('fichajes')
            .upsert(
                { user_id: userId, fecha: fechaHoy(), hora_entrada: horaActual() },
                { onConflict: 'user_id,fecha' }
            )
            .select()
            .single()
        const ok = aplicar(resultado)
        if (ok && resultado.data?.hora_entrada) setAviso({ accion: 'entrada', hora: resultado.data.hora_entrada, anterior })
        return ok
    }

    // bolsaMinutos: horas de la bolsa que cubren una salida antes de tu hora
    async function marcarSalida(bolsaMinutos?: number) {
        const cambios: Record<string, unknown> = { hora_salida: horaActual() }
        if (bolsaMinutos) cambios.bolsa_minutos = bolsaMinutos
        const anterior = fichaje
        const resultado = await supabase
            .from('fichajes')
            .update(cambios)
            .eq('user_id', userId)
            .eq('fecha', fechaHoy())
            .select()
            .single()
        const ok = aplicar(resultado)
        if (ok && resultado.data?.hora_salida) setAviso({ accion: 'salida', hora: resultado.data.hora_salida, anterior })
        return ok
    }

    // Vuelve el día a como estaba antes del último fichaje (ver lib/deshacer.ts)
    async function deshacer() {
        if (!aviso) return false
        const plan = planDeshacer(aviso.anterior, fichaje)
        if (plan.tipo === 'borrar') {
            const { error } = await supabase
                .from('fichajes')
                .delete()
                .eq('user_id', userId)
                .eq('fecha', fechaHoy())
            if (error) return false
            setFichaje(null)
            setVersion((n) => n + 1)
            setAviso(null)
            return true
        }
        const ok = aplicar(await supabase
            .from('fichajes')
            .update(plan.campos)
            .eq('user_id', userId)
            .eq('fecha', fechaHoy())
            .select()
            .single())
        if (ok) setAviso(null)
        return ok
    }

    function descartarAviso() {
        setAviso(null)
    }

    async function guardarHoras(entrada: string | null, salida: string | null) {
        // Tras corregir a mano, «Deshacer» desharía también la corrección: se quita el aviso
        setAviso(null)
        return aplicar(await supabase
            .from('fichajes')
            .upsert(
                { user_id: userId, fecha: fechaHoy(), hora_entrada: entrada, hora_salida: salida },
                { onConflict: 'user_id,fecha' }
            )
            .select()
            .single())
    }

    async function guardarNota(nota: string | null) {
        return aplicar(await supabase
            .from('fichajes')
            .update({ nota })
            .eq('user_id', userId)
            .eq('fecha', fechaHoy())
            .select()
            .single())
    }

    // Para cuando otra pantalla (Historial) cambia el día de hoy
    function recargar() {
        setRecarga((n) => n + 1)
    }

    const enCurso = !!fichaje?.hora_entrada && !fichaje?.hora_salida

    return {
        fichaje, cargando, enCurso, version, aviso,
        marcarEntrada, marcarSalida, deshacer, descartarAviso, guardarHoras, guardarNota, recargar,
    }
}

export type FichajeHoy = ReturnType<typeof useFichajeHoy>

// Fecha actual que se refresca cada segundo mientras `activo` (para cronómetros)
export function useAhora(activo: boolean): Date {
    const [ahora, setAhora] = useState(() => new Date())
    useEffect(() => {
        if (!activo) return
        const id = setInterval(() => setAhora(new Date()), 1000)
        return () => clearInterval(id)
    }, [activo])
    return ahora
}
