import type { Session } from '@supabase/supabase-js'
import type { HorarioDia } from '../lib/schedule'
import type { FichajeHoy } from '../lib/fichajeHoy'
import Fichaje from '../components/Fichaje'
import ResumenCorto from '../components/ResumenCorto'
import Racha from '../components/Racha'

interface Props {
    session: Session
    nombre: string | null
    horariosPorDia: (HorarioDia | null)[]
    fichajeHoy: FichajeHoy
}

export default function PaginaPrincipal({ session, nombre, horariosPorDia, fichajeHoy }: Props) {
    return (
        <div className="max-w-md mx-auto px-4 py-6 md:py-10">
            <div className="mb-5">
                <h1 className="text-2xl font-semibold">
                    {nombre ? `Hola, ${nombre} 👋` : 'TempoMio'}
                </h1>
                {/* La versión sube con cada fichaje guardado: la racha se recalcula */}
                <Racha userId={session.user.id} recarga={fichajeHoy.version} />
            </div>
            <div className="space-y-4">
                <Fichaje fichajeHoy={fichajeHoy} horariosPorDia={horariosPorDia} />
                <ResumenCorto userId={session.user.id} horariosPorDia={horariosPorDia} recarga={fichajeHoy.version} />
            </div>
        </div>
    )
}
