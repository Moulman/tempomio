import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { leerEnlaceEmail } from '../lib/enlaceEmail'
import { Marca } from '../components/Iconos'

// /aceptar?token_hash=...&type=invite — destino del botón del email de invitación.
// El código solo se gasta al pulsar «Aceptar la invitación» (ver lib/enlaceEmail.ts).
export default function AceptarInvitacion() {
    const enlace = leerEnlaceEmail(window.location.search)
    const [aceptando, setAceptando] = useState(false)
    const [caducado, setCaducado] = useState(!enlace)

    async function aceptar() {
        if (!enlace) return
        setAceptando(true)
        const { error } = await supabase.auth.verifyOtp({ token_hash: enlace.tokenHash, type: enlace.tipo })
        if (error) {
            setAceptando(false)
            setCaducado(true)
            return
        }
        // Con la sesión ya abierta, la app pide elegir contraseña
        window.location.replace('/')
    }

    return (
        <div className="min-h-screen bg-fondo flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm text-center">
                <Marca width={48} height={48} className="mx-auto mb-3" />
                {caducado ? (
                    <>
                        <h1 className="text-2xl font-semibold text-tinta">Este enlace ya no sirve</h1>
                        <p role="alert" className="text-sm text-tinta-suave mt-2">
                            Ya se ha usado o ha caducado. Pide a quien te invitó que te envíe una invitación nueva.
                        </p>
                        <a href="/" className="inline-block mt-6 text-sm text-acento font-medium">Ir a TempoMio</a>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-semibold text-tinta">Te han invitado a TempoMio</h1>
                        <p className="text-sm text-tinta-suave mt-2">
                            Acepta la invitación y elige tu contraseña para empezar.
                        </p>
                        <button
                            onClick={aceptar}
                            disabled={aceptando}
                            className="mt-6 w-full py-3 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60"
                        >
                            {aceptando ? 'Un momento...' : 'Aceptar la invitación'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
