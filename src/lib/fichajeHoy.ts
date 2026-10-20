import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fechaLocal } from './schedule'
import type { Fichaje } from './schedule'

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
        return aplicar(await supabase
            .from('fichajes')
            .upsert(
                { user_id: userId, fecha: fechaHoy(), hora_entrada: horaActual() },
                { onConflict: 'user_id,fecha' }
            )
            .select()
            .single())
    }

    async function marcarSalida() {
        return aplicar(await supabase
            .from('fichajes')
            .update({ hora_salida: horaActual() })
            .eq('user_id', userId)
            .eq('fecha', fechaHoy())
            .select()
            .single())
    }

    async function guardarHoras(entrada: string | null, salida: string | null) {
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

    return { fichaje, cargando, enCurso, version, marcarEntrada, marcarSalida, guardarHoras, guardarNota, recargar }
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
