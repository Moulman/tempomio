import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import type { HorarioDia } from '../lib/schedule'
import Fichaje from '../components/Fichaje'
import Resumen from '../components/Resumen'
import HorarioBase from '../components/HorarioBase'

interface Props {
    session: Session
    nombre: string | null
    horariosPorDia: (HorarioDia | null)[]
    onHorariosActualizados: () => void
}

export default function PaginaPrincipal({ session, nombre, horariosPorDia, onHorariosActualizados }: Props) {
    return (
        <div className="max-w-md mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">
                    {nombre ? `Hola, ${nombre} 👋` : 'TempoMio'}
                </h1>
                <div className="flex items-center gap-3">
                    <Link to="/perfil" className="text-sm text-sky-400 hover:text-sky-300">
                        Perfil
                    </Link>
                    <Link to="/historial" className="text-sm text-sky-400 hover:text-sky-300">
                        Historial
                    </Link>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="text-sm text-slate-400 hover:text-slate-200"
                    >
                        Salir
                    </button>
                </div>
            </div>
            <Fichaje userId={session.user.id} horariosPorDia={horariosPorDia} />
            <Resumen horariosPorDia={horariosPorDia} />
            <HorarioBase userId={session.user.id} horariosPorDia={horariosPorDia} onActualizado={onHorariosActualizados} />
        </div>
    )
}