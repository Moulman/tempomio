import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { LONGITUD_MINIMA, problemaContrasena } from '../lib/contrasena'
import { Marca } from './Iconos'

interface Props {
    session: Session
}

// Primera pantalla de quien entra por una invitación (el enlace del email ya
// ha iniciado su sesión): elige su contraseña para las próximas veces.
// Al guardarla se quita `contrasena_pendiente` y App pasa a la bienvenida.
export default function ElegirContrasena({ session }: Props) {
    const [contrasena, setContrasena] = useState('')
    const [repetida, setRepetida] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [guardando, setGuardando] = useState(false)

    async function guardar(e: React.FormEvent) {
        e.preventDefault()
        // Se valida aquí (y no con minLength en el input) para enseñar el
        // motivo en español y que lo lean los lectores de pantalla (role="alert")
        const problema = problemaContrasena(contrasena, repetida)
        if (problema) {
            setError(problema)
            return
        }
        setGuardando(true)
        setError(null)
        const { error } = await supabase.auth.updateUser({ password: contrasena, data: { contrasena_pendiente: false } })
        setGuardando(false)
        if (error) setError('No se pudo guardar la contraseña. Inténtalo otra vez.')
    }

    const campo = 'w-full bg-fondo border border-linea rounded-lg px-3 py-2.5 text-tinta focus:outline-none focus:ring-2 focus:ring-acento'

    return (
        <div className="min-h-screen bg-fondo flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm">
                <div className="text-center mb-6">
                    <Marca width={48} height={48} className="mx-auto mb-3" />
                    <h1 className="text-2xl font-semibold text-tinta">Elige tu contraseña</h1>
                    <p className="text-sm text-tinta-suave mt-1">
                        La usarás para entrar en TempoMio con {session.user.email}
                    </p>
                </div>

                <form onSubmit={guardar} className="bg-superficie border border-linea rounded-xl p-6 shadow-sm space-y-3">
                    <label className="block text-sm text-tinta-suave">
                        Contraseña
                        <input
                            type="password"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            required
                            autoComplete="new-password"
                            className={`mt-1 ${campo}`}
                        />
                    </label>
                    <label className="block text-sm text-tinta-suave">
                        Repite la contraseña
                        <input
                            type="password"
                            value={repetida}
                            onChange={(e) => setRepetida(e.target.value)}
                            required
                            autoComplete="new-password"
                            className={`mt-1 ${campo}`}
                        />
                    </label>
                    <p className="text-xs text-tinta-suave">Al menos {LONGITUD_MINIMA} caracteres.</p>
                    {error && (
                        <p role="alert" className="text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2">{error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={guardando}
                        className="w-full py-3 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60"
                    >
                        {guardando ? 'Guardando...' : 'Guardar y entrar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
