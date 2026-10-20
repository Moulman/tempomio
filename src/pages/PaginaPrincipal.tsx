import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { HorarioDia } from '../lib/schedule'
import Fichaje from '../components/Fichaje'
import Resumen from '../components/Resumen'
import HorarioBase from '../components/HorarioBase'
import Racha from '../components/Racha'

interface Props {
    session: Session
    nombre: string | null
    horariosPorDia: (HorarioDia | null)[]
    onHorariosActualizados: () => void
}

export default function PaginaPrincipal({ session, nombre, horariosPorDia, onHorariosActualizados }: Props) {
    // Se incrementa al fichar para que la racha se recalcule
    const [recargaRacha, setRecargaRacha] = useState(0)

    return (
        <div className="max-w-md mx-auto px-4 py-6 md:py-10">
            <div className="mb-5">
                <h1 className="text-2xl font-semibold">
                    {nombre ? `Hola, ${nombre} 👋` : 'TempoMio'}
                </h1>
                <Racha userId={session.user.id} recarga={recargaRacha} />
            </div>
            <div className="space-y-4">
                <Fichaje
                    userId={session.user.id}
                    horariosPorDia={horariosPorDia}
                    onCambio={() => setRecargaRacha((n) => n + 1)}
                />
                <Resumen userId={session.user.id} horariosPorDia={horariosPorDia} />
                <HorarioBase userId={session.user.id} horariosPorDia={horariosPorDia} onActualizado={onHorariosActualizados} />
            </div>
        </div>
    )
}
