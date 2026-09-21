import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

interface Props {
    session: Session
    nombre: string | null
    onPerfilActualizado: () => void
}

export default function PaginaPerfil({ session, nombre, onPerfilActualizado }: Props) {
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
        <div className="max-w-md mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Perfil</h1>
                <Link to="/" className="text-sm text-sky-400 hover:text-sky-300">← Volver</Link>
            </div>

            <div className="bg-slate-800 rounded-2xl p-5">
                <label className="block text-sm text-slate-400 mb-2">Nombre</label>
                <input
                    type="text"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 mb-2"
                />
                <p className="text-xs text-slate-500 mb-4">Email: {session.user.email}</p>
                <button
                    onClick={guardar}
                    disabled={guardando}
                    className="w-full py-2.5 rounded-xl bg-sky-400 text-slate-900 font-semibold"
                >
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                {guardado && <p className="text-green-400 text-sm text-center mt-2">Guardado ✓</p>}
            </div>
        </div>
    )
}