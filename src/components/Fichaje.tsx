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
        <div style={{ background: '#f4f4f5', borderRadius: 16, padding: 20, marginTop: 16 }}>
            <h2 style={{ textTransform: 'capitalize' }}>
                {hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>

            <div style={{ display: 'flex', justifyContent: 'space-around', margin: '16px 0' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Entrada</div>
                    <div style={{ fontSize: 26, fontWeight: 600 }}>{fichaje?.hora_entrada?.slice(0, 5) || '—'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Salida</div>
                    <div style={{ fontSize: 26, fontWeight: 600 }}>{fichaje?.hora_salida?.slice(0, 5) || '—'}</div>
                </div>
            </div>

            {!fichaje?.hora_entrada && (
                <button onClick={marcarEntrada} style={{ width: '100%', padding: 14 }}>Marcar entrada</button>
            )}
            {fichaje?.hora_entrada && !fichaje?.hora_salida && (
                <button onClick={marcarSalida} style={{ width: '100%', padding: 14 }}>Marcar salida</button>
            )}
            {fichaje?.hora_entrada && fichaje?.hora_salida && (
                <p style={{ textAlign: 'center', fontWeight: 600, color: extra >= 0 ? 'green' : 'red' }}>
                    Extra de hoy: {formatMinutos(extra)}
                </p>
            )}
        </div>
    )
}