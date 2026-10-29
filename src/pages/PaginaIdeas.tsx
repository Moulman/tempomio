import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { MAX_LONGITUD_IDEA, PRIORIDADES } from '../lib/sugerencias'
import { guardarIdeaCerrada } from '../lib/pedirIdea'
import type { Prioridad } from '../lib/sugerencias'

interface Props {
    session: Session
}

const PLACEHOLDERS: Record<Prioridad, string> = {
    lo_necesito: 'Cuéntame qué echas de menos cada día...',
    estaria_guay: 'Sueña a lo grande: ¿qué haría TempoMio más chulo?',
    bug: '¿Qué ha pasado? ¿Qué esperabas que pasara?',
}

export default function PaginaIdeas({ session }: Props) {
    const [prioridad, setPrioridad] = useState<Prioridad>('estaria_guay')
    const [texto, setTexto] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [enviada, setEnviada] = useState(false)

    async function enviar(e: React.FormEvent) {
        e.preventDefault()
        if (!texto.trim()) return

        setEnviando(true)
        setError(null)
        const { error } = await supabase.from('sugerencias').insert({
            user_id: session.user.id,
            prioridad,
            texto: texto.trim(),
        })
        setEnviando(false)

        if (error) {
            setError('No se ha podido enviar. Inténtalo de nuevo en un momento.')
            return
        }
        // Ya ha contado una idea hoy: no se le vuelve a pedir en Hoy
        guardarIdeaCerrada(session.user.id)
        setEnviada(true)
    }

    function otraIdea() {
        setTexto('')
        setPrioridad('estaria_guay')
        setEnviada(false)
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Ideas</h1>
            </div>

            <div className="bg-superficie border border-linea rounded-xl p-5">
                {enviada ? (
                    <div className="text-center py-6">
                        <div className="text-5xl mb-3">🚀</div>
                        <p className="text-lg font-semibold">¡Recibido!</p>
                        <p className="text-sm text-tinta-suave mt-1">Si es buena, la verás pronto 🚀</p>
                        <button onClick={otraIdea} className="mt-5 text-sm text-acento hover:opacity-80">
                            Tengo otra idea
                        </button>
                    </div>
                ) : (
                    <form onSubmit={enviar}>
                        <h2 className="text-lg font-semibold">¿Qué le falta a TempoMio? 🤔</h2>
                        <p className="text-sm text-tinta-suave mt-1 mb-4">
                            Ideas, caprichos o cosas que no funcionan: todo vale.
                        </p>

                        <div className="grid grid-cols-3 gap-2 mb-4" role="radiogroup" aria-label="Prioridad">
                            {PRIORIDADES.map((p) => {
                                const activa = prioridad === p.valor
                                return (
                                    <button
                                        key={p.valor}
                                        type="button"
                                        role="radio"
                                        aria-checked={activa}
                                        onClick={() => setPrioridad(p.valor)}
                                        className={`rounded-xl border px-2 py-3 text-center transition-all ${activa
                                            ? 'border-acento bg-acento/10 scale-105'
                                            : 'border-linea hover:border-tinta-tenue'}`}
                                    >
                                        <span className="block text-2xl">{p.emoji}</span>
                                        <span className={`block text-xs mt-1 ${activa ? 'text-tinta' : 'text-tinta-suave'}`}>
                                            {p.titulo}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        <label htmlFor="texto-idea" className="block text-sm text-tinta-suave mb-1">
                            Tu idea
                        </label>
                        <textarea
                            id="texto-idea"
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            placeholder={PLACEHOLDERS[prioridad]}
                            rows={5}
                            maxLength={MAX_LONGITUD_IDEA}
                            required
                            className="w-full bg-fondo border border-linea rounded-lg px-3 py-2.5 text-tinta placeholder:text-tinta-tenue focus:outline-none focus:ring-2 focus:ring-acento"
                        />
                        <p className="text-xs text-tinta-tenue text-right mt-1">
                            {texto.length}/{MAX_LONGITUD_IDEA}
                        </p>

                        {error && (
                            <p className="text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2 mt-2">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={enviando || !texto.trim()}
                            className="w-full mt-3 py-3 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60"
                        >
                            {enviando ? 'Enviando...' : 'Enviar idea'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
