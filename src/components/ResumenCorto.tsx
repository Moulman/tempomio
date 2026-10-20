import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { extraDelDia, fechaLocal, formatMinutos, lunesDeSemana } from '../lib/schedule'
import type { Fichaje, HorarioDia } from '../lib/schedule'

interface Props {
    userId: string
    horariosPorDia: (HorarioDia | null)[]
    // Cambia al fichar para recalcular
    recarga: number
}

// Extra acumulado de la semana y del mes en curso, con enlace a la vista semanal
export default function ResumenCorto({ userId, horariosPorDia, recarga }: Props) {
    const [fichajes, setFichajes] = useState<Fichaje[] | null>(null)

    const hoy = new Date()
    const lunes = lunesDeSemana(hoy)
    const primeroDeMes = fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
    // La semana puede empezar en el mes anterior: se carga desde lo que llegue antes
    const desde = lunes < primeroDeMes ? lunes : primeroDeMes

    useEffect(() => {
        let cancelado = false
        supabase
            .from('fichajes')
            .select('fecha, hora_entrada, hora_salida')
            .eq('user_id', userId)
            .gte('fecha', desde)
            .then(({ data }) => {
                if (!cancelado) setFichajes(data || [])
            })
        return () => { cancelado = true }
    }, [userId, desde, recarga])

    let extraSemana = 0
    let extraMes = 0
    for (const f of fichajes || []) {
        const extra = extraDelDia(f, horariosPorDia[new Date(f.fecha + 'T00:00:00').getDay()])
        if (f.fecha >= lunes) extraSemana += extra
        if (f.fecha >= primeroDeMes) extraMes += extra
    }

    const color = (mins: number) => mins > 0 ? 'text-positivo' : mins < 0 ? 'text-negativo' : ''

    return (
        <section className="bg-superficie border border-linea rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-medium">Horas extra</h2>
                <Link to="/semana" className="text-sm text-acento hover:opacity-80">Ver semana ›</Link>
            </div>
            <div className={`grid grid-cols-2 gap-3 ${fichajes ? '' : 'opacity-50'}`}>
                <div className="bg-fondo rounded-xl px-4 py-3">
                    <p className="text-xs text-tinta-suave">Esta semana</p>
                    <p className={`mt-0.5 text-xl font-semibold tabular-nums ${color(extraSemana)}`}>{formatMinutos(extraSemana)}</p>
                </div>
                <div className="bg-fondo rounded-xl px-4 py-3">
                    <p className="text-xs text-tinta-suave capitalize">{hoy.toLocaleDateString('es-ES', { month: 'long' })}</p>
                    <p className={`mt-0.5 text-xl font-semibold tabular-nums ${color(extraMes)}`}>{formatMinutos(extraMes)}</p>
                </div>
            </div>
        </section>
    )
}
