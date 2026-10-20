import { useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Fichaje } from '../lib/schedule'

interface Props {
    userId: string
    fecha: string
    fichaje: Fichaje | undefined
    onGuardado: () => void
    onCancelar: () => void
}

// Edición a mano de un día (entrada, salida y nota). Lo usan Historial y Semana.
export default function EditorDia({ userId, fecha, fichaje, onGuardado, onCancelar }: Props) {
    const [entrada, setEntrada] = useState(fichaje?.hora_entrada?.slice(0, 5) || '')
    const [salida, setSalida] = useState(fichaje?.hora_salida?.slice(0, 5) || '')
    const [nota, setNota] = useState(fichaje?.nota || '')
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function guardar() {
        setGuardando(true)
        setError(null)
        const { error } = await supabase
            .from('fichajes')
            .upsert(
                {
                    user_id: userId,
                    fecha,
                    hora_entrada: entrada || null,
                    hora_salida: salida || null,
                    nota: nota || null,
                },
                { onConflict: 'user_id,fecha' }
            )
        setGuardando(false)
        if (error) {
            setError('No se pudo guardar. Inténtalo otra vez.')
            return
        }
        onGuardado()
    }

    return (
        <div className="space-y-3">
            <div className="flex gap-3">
                <label className="flex-1 text-xs text-tinta-suave">
                    Entrada
                    <input
                        type="time"
                        value={entrada}
                        onChange={(e) => setEntrada(e.target.value)}
                        className="w-full mt-1 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                    />
                </label>
                <label className="flex-1 text-xs text-tinta-suave">
                    Salida
                    <input
                        type="time"
                        value={salida}
                        onChange={(e) => setSalida(e.target.value)}
                        className="w-full mt-1 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                    />
                </label>
            </div>
            <label className="block text-xs text-tinta-suave">
                Nota
                <textarea
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Motivo (opcional)"
                    rows={2}
                    className="w-full mt-1 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                />
            </label>
            {error && <p className="text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2.5">
                <button
                    onClick={guardar}
                    disabled={guardando}
                    className="flex-1 py-2.5 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60"
                >
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={onCancelar} className="flex-1 py-2.5 rounded-xl border border-linea text-tinta">
                    Cancelar
                </button>
            </div>
        </div>
    )
}
