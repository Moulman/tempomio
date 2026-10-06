import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import type { HorarioDia } from '../lib/schedule'
import Fichaje from '../components/Fichaje'
import Resumen from '../components/Resumen'
import HorarioBase from '../components/HorarioBase'
import Racha from '../components/Racha'

interface Props {
    session: Session
    nombre: string | null
    esAdmin: boolean
    horariosPorDia: (HorarioDia | null)[]
    onHorariosActualizados: () => void
}

export default function PaginaPrincipal({ session, nombre, esAdmin, horariosPorDia, onHorariosActualizados }: Props) {
    // Se incrementa al fichar para que la racha se recalcule
    const [recargaRacha, setRecargaRacha] = useState(0)

    return (
        <div className="max-w-md mx-auto px-4 py-6">
            <div className="flex flex-wrap justify-between items-start gap-x-4 gap-y-2 mb-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        {nombre ? `Hola, ${nombre} 👋` : 'TempoMio'}
                    </h1>
                    <Racha userId={session.user.id} recarga={recargaRacha} />
                </div>
                <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5">
                    {esAdmin && (
                        <Link to="/admin" className="text-sm text-amber-400 hover:text-amber-300">
                            Admin
                        </Link>
                    )}
                    <Link to="/perfil" className="text-sm text-sky-400 hover:text-sky-300">
                        Perfil
                    </Link>
                    <Link to="/historial" className="text-sm text-sky-400 hover:text-sky-300">
                        Historial
                    </Link>
                    <Link to="/ideas" className="text-sm text-sky-400 hover:text-sky-300">
                        💡 Ideas
                    </Link>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="text-sm text-slate-400 hover:text-slate-200"
                    >
                        Salir
                    </button>
                </nav>
            </div>
            <Fichaje
                userId={session.user.id}
                horariosPorDia={horariosPorDia}
                onCambio={() => setRecargaRacha((n) => n + 1)}
            />
            <Resumen userId={session.user.id} horariosPorDia={horariosPorDia} />
            <HorarioBase userId={session.user.id} horariosPorDia={horariosPorDia} onActualizado={onHorariosActualizados} />
        </div>
    )
}
