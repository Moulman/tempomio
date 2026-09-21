import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { extraDelDia, formatMinutos } from '../lib/schedule'
import type { Fichaje as FichajeType, HorarioDia } from '../lib/schedule'

interface Props {
    userId: string
    horariosPorDia: (HorarioDia | null)[]
}

function horaActual(): string {
    return new Date().toTimeString().slice(0, 5) // "HH:MM"
}

function fechaHoy(): string {
    return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

export default function Fichaje({ userId, horariosPorDia }: Props) {
    const [fichaje, setFichaje] = useState<FichajeType | null>(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        cargarFichajeHoy()
    }, [])

    async function cargarFichajeHoy() {
        setCargando(true)
        const { data } = await supabase
            .from('fichajes')
            .select('*')
            .eq('fecha', fechaHoy())
            .maybeSingle()
        setFichaje(data)
        setCargando(false)
    }

    async function marcarEntrada() {
        const { data, error } = await supabase
            .from('fichajes')
            .upsert(
                { user_id: userId, fecha: fechaHoy(), hora_entrada: horaActual() },
                { onConflict: 'user_id,fecha' }
            )
            .select()
            .single()
        if (!error) setFichaje(data)
    }

    async function marcarSalida() {
        const { data, error } = await supabase
            .from('fichajes')
            .update({ hora_salida: horaActual() })
            .eq('fecha', fechaHoy())
            .select()
            .single()
        if (!error) setFichaje(data)
    }

    if (cargando) return <p>Cargando...</p>

    const hoy = new Date()
    const horarioHoy = horariosPorDia[hoy.getDay()]
    const extra = fichaje ? extraDelDia(fichaje, horarioHoy) : 0

    return (
        <div className="bg-slate-800 rounded-2xl p-5 mt-4">
            <h2 className="text-base font-medium capitalize mb-4">
                {hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>

            <div className="flex justify-around my-4">
                <div className="text-center">
                    <div className="text-xs text-slate-400">Entrada</div>
                    <div className="text-3xl font-semibold">{fichaje?.hora_entrada?.slice(0, 5) || '—'}</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-slate-400">Salida</div>
                    <div className="text-3xl font-semibold">{fichaje?.hora_salida?.slice(0, 5) || '—'}</div>
                </div>
            </div>

            {!fichaje?.hora_entrada && (
                <button
                    onClick={marcarEntrada}
                    className="w-full py-3.5 rounded-xl bg-sky-400 text-slate-900 font-semibold"
                >
                    Marcar entrada
                </button>
            )}
            {fichaje?.hora_entrada && !fichaje?.hora_salida && (
                <button
                    onClick={marcarSalida}
                    className="w-full py-3.5 rounded-xl bg-sky-400 text-slate-900 font-semibold"
                >
                    Marcar salida
                </button>
            )}
            {fichaje?.hora_entrada && fichaje?.hora_salida && (
                <div className={`text-center py-2.5 rounded-xl font-semibold ${extra >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    Extra de hoy: {formatMinutos(extra)}
                </div>
            )}
        </div>
    )
}