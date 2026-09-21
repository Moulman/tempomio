import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { agruparPorSemana, agruparPorMes, formatMinutos } from '../lib/schedule'
import type { Fichaje, HorarioDia } from '../lib/schedule'

interface Props {
    horariosPorDia: (HorarioDia | null)[]
}

export default function Resumen({ horariosPorDia }: Props) {
    const [fichajes, setFichajes] = useState<Fichaje[]>([])
    const [vista, setVista] = useState<'semana' | 'mes'>('semana')
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        cargarFichajes()
    }, [])

    async function cargarFichajes() {
        setCargando(true)
        // Últimos ~4 meses: suficiente para semana y mes actuales + histórico reciente
        const desde = new Date()
        desde.setMonth(desde.getMonth() - 4)

        const { data } = await supabase
            .from('fichajes')
            .select('*')
            .gte('fecha', desde.toISOString().slice(0, 10))
            .order('fecha', { ascending: false })

        setFichajes(data || [])
        setCargando(false)
    }

    if (cargando) return <p>Cargando resumen...</p>

    const semanas = agruparPorSemana(fichajes, horariosPorDia)
    const meses = agruparPorMes(fichajes, horariosPorDia)

    return (
        <div style={{ background: '#f4f4f5', borderRadius: 16, padding: 20, marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                    onClick={() => setVista('semana')}
                    style={{ flex: 1, fontWeight: vista === 'semana' ? 700 : 400 }}
                >
                    Semanas
                </button>
                <button
                    onClick={() => setVista('mes')}
                    style={{ flex: 1, fontWeight: vista === 'mes' ? 700 : 400 }}
                >
                    Meses
                </button>
            </div>

            {vista === 'semana' && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {semanas.map((s) => (
                        <li key={s.semanaInicio} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #ddd' }}>
                            <span>
                                Semana del {new Date(s.semanaInicio + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                            <span style={{ fontWeight: 600, color: s.extraMinutos >= 0 ? 'green' : 'red' }}>
                                {formatMinutos(s.extraMinutos)}
                            </span>
                        </li>
                    ))}
                    {semanas.length === 0 && <p>Aún no hay fichajes registrados.</p>}
                </ul>
            )}

            {vista === 'mes' && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {meses.map((m) => (
                        <li key={m.mes} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #ddd' }}>
                            <span>
                                {new Date(m.mes + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                            <span style={{ fontWeight: 600, color: m.extraMinutos >= 0 ? 'green' : 'red' }}>
                                {formatMinutos(m.extraMinutos)}
                            </span>
                        </li>
                    ))}
                    {meses.length === 0 && <p>Aún no hay fichajes registrados.</p>}
                </ul>
            )}
        </div>
    )
}