import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { leerEnlaceEmail } from '../lib/enlaceEmail'
import { Marca } from '../components/Iconos'

// /aceptar?token_hash=...&type=invite|recovery — destino del botón de los emails
// (invitación y «¿Has olvidado tu contraseña?»). El código solo se gasta al pulsar
// el botón (ver lib/enlaceEmail.ts).
export default function AceptarInvitacion() {
    const enlace = leerEnlaceEmail(window.location.search)
    const recuperar = enlace?.tipo === 'recovery'
    const [aceptando, setAceptando] = useState(false)
    const [caducado, setCaducado] = useState(!enlace)
    const [errorMarca, setErrorMarca] = useState(false)

    async function aceptar() {
        if (!enlace) return
        setAceptando(true)
        const { error } = await supabase.auth.verifyOtp({ token_hash: enlace.tokenHash, type: enlace.tipo })
        if (error) {
            setAceptando(false)
            setCaducado(true)
            return
        }
        if (recuperar) {
            // Marca propia (no `contrasena_pendiente`, que es solo de invitaciones):
            // App enseña la pantalla de contraseña nueva hasta que la guarde
            const { error: errorMarca } = await supabase.auth.updateUser({ data: { cambiando_contrasena: true } })
            if (errorMarca) {
                setAceptando(false)
                setErrorMarca(true)
                return
            }
        }
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
                            {recuperar
                                ? 'Ya se ha usado o ha caducado. Vuelve a pedirlo con «¿Has olvidado tu contraseña?».'
                                : 'Ya se ha usado o ha caducado. Pide a quien te invitó que te envíe una invitación nueva.'}
                        </p>
                        <a href="/" className="inline-block mt-6 text-sm text-acento font-medium">Ir a TempoMio</a>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-semibold text-tinta">
                            {recuperar ? 'Cambia tu contraseña' : 'Te han invitado a TempoMio'}
                        </h1>
                        <p className="text-sm text-tinta-suave mt-2">
                            {recuperar
                                ? 'Pulsa el botón para elegir una contraseña nueva.'
                                : 'Acepta la invitación y elige tu contraseña para empezar.'}
                        </p>
                        {errorMarca && (
                            <p role="alert" className="text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2 mt-4">
                                Algo ha fallado. Pulsa el botón otra vez.
                            </p>
                        )}
                        <button
                            onClick={aceptar}
                            disabled={aceptando}
                            className="mt-6 w-full py-3 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60"
                        >
                            {aceptando ? 'Un momento...' : recuperar ? 'Elegir contraseña nueva' : 'Aceptar la invitación'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
