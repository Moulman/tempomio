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
        <div className="bg-slate-800 rounded-2xl p-5 mt-4">
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setVista('semana')}
                    className={`flex-1 py-2 rounded-lg text-sm ${vista === 'semana' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
                >
                    Semanas
                </button>
                <button
                    onClick={() => setVista('mes')}
                    className={`flex-1 py-2 rounded-lg text-sm ${vista === 'mes' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
                >
                    Meses
                </button>
            </div>

            {vista === 'semana' && (
                <ul className="space-y-0">
                    {semanas.map((s) => (
                        <li key={s.semanaInicio} className="flex justify-between py-2.5 border-b border-slate-700 last:border-0 text-sm">
                            <span>
                                Semana del {new Date(s.semanaInicio + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className={`font-semibold ${s.extraMinutos >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatMinutos(s.extraMinutos)}
                            </span>
                        </li>
                    ))}
                    {semanas.length === 0 && <p className="text-slate-400 text-sm">Aún no hay fichajes registrados.</p>}
                </ul>
            )}

            {vista === 'mes' && (
                <ul className="space-y-0">
                    {meses.map((m) => (
                        <li key={m.mes} className="flex justify-between py-2.5 border-b border-slate-700 last:border-0 text-sm">
                            <span className="capitalize">
                                {new Date(m.mes + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                            <span className={`font-semibold ${m.extraMinutos >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatMinutos(m.extraMinutos)}
                            </span>
                        </li>
                    ))}
                    {meses.length === 0 && <p className="text-slate-400 text-sm">Aún no hay fichajes registrados.</p>}
                </ul>
            )}
        </div>
    )
}