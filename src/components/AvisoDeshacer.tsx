import { useState } from 'react'
import { textoAviso } from '../lib/deshacer'
import type { AvisoFichaje, FichajeHoy } from '../lib/fichajeHoy'

interface Props {
    fichajeHoy: FichajeHoy
}

// Aviso tras marcar entrada o salida, con «Deshacer» por si se pulsó sin querer.
// La región role="status" está siempre en la página para que los lectores de
// pantalla anuncien el texto cuando aparece.
export default function AvisoDeshacer({ fichajeHoy }: Props) {
    const { aviso, deshacer } = fichajeHoy
    return (
        <div role="status" aria-live="polite">
            {aviso && <Tarjeta key={`${aviso.accion}-${aviso.hora}`} aviso={aviso} deshacer={deshacer} />}
        </div>
    )
}

function Tarjeta({ aviso, deshacer }: { aviso: AvisoFichaje; deshacer: () => Promise<boolean> }) {
    const [ocupado, setOcupado] = useState(false)
    const [error, setError] = useState(false)

    async function pulsar() {
        setOcupado(true)
        setError(false)
        const ok = await deshacer()
        setOcupado(false)
        if (!ok) setError(true)
    }

    return (
        <div className="fixed z-20 left-4 right-4 bottom-[calc(6.75rem+env(safe-area-inset-bottom))] md:left-auto md:right-6 md:bottom-6 md:w-96 flex items-center gap-3 rounded-2xl bg-tinta text-superficie pl-4 pr-2 py-2 shadow-lg">
            <span className="flex-1 text-sm">
                {error ? 'No se pudo deshacer. Inténtalo otra vez.' : textoAviso(aviso.accion, aviso.hora)}
            </span>
            <button
                onClick={pulsar}
                disabled={ocupado}
                className="min-h-11 px-3.5 rounded-xl bg-superficie/15 text-sm font-semibold disabled:opacity-60"
            >
                Deshacer
            </button>
        </div>
    )
}
