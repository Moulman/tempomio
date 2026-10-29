import { useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Fichaje } from '../lib/schedule'
import { leerHoras } from '../lib/bolsa'

interface Props {
    userId: string
    fecha: string
    fichaje: Fichaje | undefined
    onGuardado: () => void
    onCancelar: () => void
}

// Edición a mano de un día (entrada, salida, bolsa de horas usada y nota). Lo usan Historial y Semana.
// Un día libre con bolsa: sin entrada ni salida y con las horas de bolsa.
export default function EditorDia({ userId, fecha, fichaje, onGuardado, onCancelar }: Props) {
    const [entrada, setEntrada] = useState(fichaje?.hora_entrada?.slice(0, 5) || '')
    const [salida, setSalida] = useState(fichaje?.hora_salida?.slice(0, 5) || '')
    const [nota, setNota] = useState(fichaje?.nota || '')
    const bolsaInicial = fichaje?.bolsa_minutos ?? 0
    const [bolsaH, setBolsaH] = useState(bolsaInicial ? String(Math.floor(bolsaInicial / 60)) : '')
    const [bolsaM, setBolsaM] = useState(bolsaInicial ? String(bolsaInicial % 60) : '')
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function guardar() {
        const bolsa = leerHoras(bolsaH, bolsaM)
        if (bolsa === null) {
            setError('Revisa las horas de bolsa: horas enteras y minutos entre 0 y 59.')
            return
        }
        const fila: Record<string, unknown> = {
            user_id: userId,
            fecha,
            hora_entrada: entrada || null,
            hora_salida: salida || null,
            nota: nota || null,
        }
        // Solo se envía si cambia (así guardar un día normal no depende de esa columna)
        if (bolsa !== bolsaInicial) fila.bolsa_minutos = bolsa || null

        setGuardando(true)
        setError(null)
        const { error } = await supabase
            .from('fichajes')
            .upsert(fila, { onConflict: 'user_id,fecha' })
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
            <div className="text-xs text-tinta-suave">
                Bolsa de horas usada
                <div className="mt-1 flex items-center gap-2">
                    <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={bolsaH}
                        onChange={(e) => setBolsaH(e.target.value)}
                        placeholder="0"
                        aria-label="Horas de bolsa"
                        className="w-20 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                    />
                    <span>h</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={59}
                        value={bolsaM}
                        onChange={(e) => setBolsaM(e.target.value)}
                        placeholder="0"
                        aria-label="Minutos de bolsa"
                        className="w-20 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                    />
                    <span>min</span>
                </div>
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
