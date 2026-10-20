import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { agruparPorSemana, agruparPorMes, formatMinutos } from '../lib/schedule'
import type { Fichaje, HorarioDia } from '../lib/schedule'

interface Props {
    userId: string
    horariosPorDia: (HorarioDia | null)[]
}

export default function Resumen({ userId, horariosPorDia }: Props) {
    const [fichajes, setFichajes] = useState<Fichaje[]>([])
    const [vista, setVista] = useState<'semana' | 'mes'>('semana')
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        let cancelado = false
        // Últimos ~4 meses: suficiente para semana y mes actuales + histórico reciente
        const desde = new Date()
        desde.setMonth(desde.getMonth() - 4)

        supabase
            .from('fichajes')
            .select('*')
            .eq('user_id', userId)
            .gte('fecha', desde.toISOString().slice(0, 10))
            .order('fecha', { ascending: false })
            .then(({ data }) => {
                if (cancelado) return
                setFichajes(data || [])
                setCargando(false)
            })
        return () => { cancelado = true }
    }, [userId])

    if (cargando) return <p>Cargando resumen...</p>

    const semanas = agruparPorSemana(fichajes, horariosPorDia)
    const meses = agruparPorMes(fichajes, horariosPorDia)

    return (
        <div className="bg-superficie border border-linea rounded-xl p-5">
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setVista('semana')}
                    className={`flex-1 py-2 rounded-lg text-sm ${vista === 'semana' ? 'bg-realce text-tinta' : 'text-tinta-suave'}`}
                >
                    Semanas
                </button>
                <button
                    onClick={() => setVista('mes')}
                    className={`flex-1 py-2 rounded-lg text-sm ${vista === 'mes' ? 'bg-realce text-tinta' : 'text-tinta-suave'}`}
                >
                    Meses
                </button>
            </div>

            {vista === 'semana' && (
                <ul className="space-y-0">
                    {semanas.map((s) => (
                        <li key={s.semanaInicio} className="flex justify-between py-2.5 border-b border-linea last:border-0 text-sm">
                            <span>
                                Semana del {new Date(s.semanaInicio + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className={`font-semibold ${s.extraMinutos >= 0 ? 'text-positivo' : 'text-negativo'}`}>
                                {formatMinutos(s.extraMinutos)}
                            </span>
                        </li>
                    ))}
                    {semanas.length === 0 && <p className="text-tinta-suave text-sm">Aún no hay fichajes registrados.</p>}
                </ul>
            )}

            {vista === 'mes' && (
                <ul className="space-y-0">
                    {meses.map((m) => (
                        <li key={m.mes} className="flex justify-between py-2.5 border-b border-linea last:border-0 text-sm">
                            <span className="capitalize">
                                {new Date(m.mes + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                            <span className={`font-semibold ${m.extraMinutos >= 0 ? 'text-positivo' : 'text-negativo'}`}>
                                {formatMinutos(m.extraMinutos)}
                            </span>
                        </li>
                    ))}
                    {meses.length === 0 && <p className="text-tinta-suave text-sm">Aún no hay fichajes registrados.</p>}
                </ul>
            )}
        </div>
    )
}