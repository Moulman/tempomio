import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import type { Tema } from '../lib/tema'
import type { HorarioDia } from '../lib/schedule'
import HorarioBase from '../components/HorarioBase'
import { IconoLuna, IconoSalir, IconoSol } from '../components/Iconos'

interface Props {
    session: Session
    nombre: string | null
    tema: Tema
    onAlternarTema: () => void
    horariosPorDia: (HorarioDia | null)[]
    onHorariosActualizados: () => void
    onPerfilActualizado: () => void
}

export default function PaginaPerfil({
    session, nombre, tema, onAlternarTema, horariosPorDia, onHorariosActualizados, onPerfilActualizado,
}: Props) {
    const [valor, setValor] = useState(nombre || '')
    const [guardando, setGuardando] = useState(false)
    const [guardado, setGuardado] = useState(false)

    async function guardar() {
        setGuardando(true)
        setGuardado(false)
        const { error } = await supabase
            .from('perfiles')
            .upsert({ id: session.user.id, nombre: valor })
        setGuardando(false)
        if (!error) {
            setGuardado(true)
            onPerfilActualizado()
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-10">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Perfil</h1>
            </div>

            <div className="bg-superficie border border-linea rounded-xl p-5">
                <label className="block text-sm text-tinta-suave mb-2">Nombre</label>
                <input
                    type="text"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full bg-fondo border border-linea rounded-lg px-3 py-2 text-tinta mb-2"
                />
                <p className="text-xs text-tinta-tenue mb-4">Email: {session.user.email}</p>
                <button
                    onClick={guardar}
                    disabled={guardando}
                    className="w-full py-2.5 rounded-xl bg-acento text-sobre-acento font-semibold"
                >
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                {guardado && <p className="text-positivo text-sm text-center mt-2">Guardado ✓</p>}
            </div>

            <div className="mt-4">
                <HorarioBase userId={session.user.id} horariosPorDia={horariosPorDia} onActualizado={onHorariosActualizados} />
            </div>

            {/* ---------- Apariencia ---------- */}
            <div className="bg-superficie border border-linea rounded-xl p-5 mt-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="font-medium">Tema oscuro</p>
                        <p className="text-sm text-tinta-suave">Se guarda en este dispositivo</p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={tema === 'oscuro'}
                        aria-label="Tema oscuro"
                        onClick={onAlternarTema}
                        className={`relative shrink-0 w-14 h-8 rounded-full transition-colors ${tema === 'oscuro' ? 'bg-acento' : 'bg-realce'}`}
                    >
                        <span
                            className={`absolute top-1 left-1 grid place-items-center w-6 h-6 rounded-full bg-superficie text-tinta-suave shadow-sm transition-transform ${tema === 'oscuro' ? 'translate-x-6' : ''}`}
                        >
                            {tema === 'oscuro' ? <IconoLuna width={14} height={14} /> : <IconoSol width={14} height={14} />}
                        </span>
                    </button>
                </div>
            </div>

            {/* En escritorio también está en la barra lateral */}
            <button
                onClick={() => supabase.auth.signOut()}
                className="md:hidden w-full flex items-center justify-center gap-2 mt-4 py-3 rounded-xl border border-linea text-negativo"
            >
                <IconoSalir width={18} height={18} />
                Cerrar sesión
            </button>
        </div>
    )
}
