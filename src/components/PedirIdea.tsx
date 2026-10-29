import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fechaLocal } from '../lib/schedule'
import type { HorarioDia } from '../lib/schedule'
import { guardarIdeaCerrada, leerIdeaCerrada, tocaPedirIdea } from '../lib/pedirIdea'

interface Props {
    userId: string
    horariosPorDia: (HorarioDia | null)[]
}

// Al terminar la jornada, dos veces por semana: invita a contar una idea (ver lib/pedirIdea.ts)
export default function PedirIdea({ userId, horariosPorDia }: Props) {
    const [cerradaEl, setCerradaEl] = useState(() => leerIdeaCerrada(userId))
    const ahora = new Date()
    if (!tocaPedirIdea(ahora, horariosPorDia, cerradaEl)) return null

    function cerrar() {
        const hoy = fechaLocal(new Date())
        guardarIdeaCerrada(userId, hoy)
        setCerradaEl(hoy)
    }

    return (
        <div className="flex items-start gap-3 bg-superficie border border-linea rounded-2xl pl-4 pr-1 py-1">
            <span aria-hidden="true" className="pt-3">💡</span>
            <div className="flex-1 pt-3">
                <p className="text-sm">¿Qué mejorarías de TempoMio?</p>
                <Link to="/ideas" className="inline-flex items-center min-h-11 text-sm font-semibold text-acento">
                    Contar una idea →
                </Link>
            </div>
            <button
                onClick={cerrar}
                aria-label="No mostrar hoy"
                className="grid place-items-center min-w-11 min-h-11 text-tinta-suave hover:text-tinta"
            >
                ✕
            </button>
        </div>
    )
}
