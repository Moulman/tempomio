import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { extraDelDia, fechaLocal, formatMinutos, lunesDeSemana } from '../lib/schedule'
import type { HorarioDia } from '../lib/schedule'
import type { Bolsa, ResumenBolsa } from '../lib/bolsa'

interface Props {
    bolsa: Bolsa
    resumen: ResumenBolsa
    horariosPorDia: (HorarioDia | null)[]
}

const color = (mins: number) => mins > 0 ? 'text-positivo' : mins < 0 ? 'text-negativo' : ''

// Tarjeta de Hoy: saldo de la bolsa y extra de la semana. A quien ya tenía
// fichajes antes de existir la bolsa se le pregunta una vez por su saldo de partida.
export default function TarjetaBolsa({ bolsa, resumen, horariosPorDia }: Props) {
    const navigate = useNavigate()
    const [guardando, setGuardando] = useState(false)

    const lunes = lunesDeSemana(new Date())
    let extraSemana = 0
    for (const f of bolsa.fichajes) {
        if (f.fecha >= lunes) extraSemana += extraDelDia(f, horariosPorDia[new Date(f.fecha + 'T00:00:00').getDay()])
    }

    const sinSaldoInicial = !bolsa.error && !resumen.inicial && bolsa.fichajes.length > 0
    const primerFichaje = bolsa.fichajes[0]?.fecha ?? fechaLocal(new Date())

    async function estaBienAsi() {
        setGuardando(true)
        await bolsa.guardarInicial(0, primerFichaje)
        setGuardando(false)
    }

    return (
        <section className="bg-superficie border border-linea rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-medium">{bolsa.error ? 'Horas extra' : 'Bolsa de horas'}</h2>
                {!bolsa.error && <Link to="/bolsa" className="text-sm text-acento hover:opacity-80">Ver bolsa ›</Link>}
            </div>

            <div className={`grid grid-cols-2 gap-3 ${bolsa.cargado ? '' : 'opacity-50'}`}>
                {!bolsa.error && (
                    <Link to="/bolsa" className="bg-fondo rounded-xl px-4 py-3">
                        <p className="text-xs text-tinta-suave">Disponible</p>
                        <p className={`mt-0.5 text-xl font-semibold tabular-nums ${color(resumen.disponible)}`}>
                            {formatMinutos(resumen.disponible)}
                        </p>
                    </Link>
                )}
                <Link to="/semana" className="bg-fondo rounded-xl px-4 py-3">
                    <p className="text-xs text-tinta-suave">Extra esta semana</p>
                    <p className={`mt-0.5 text-xl font-semibold tabular-nums ${color(extraSemana)}`}>
                        {formatMinutos(extraSemana)}
                    </p>
                </Link>
            </div>

            {/* ---------- Aviso único para quien ya usaba la app ---------- */}
            {sinSaldoInicial && (
                <div className="mt-4 rounded-xl border border-acento/40 bg-acento/5 p-4">
                    <p className="font-medium">Nuevo: tu bolsa de horas</p>
                    <p className="mt-1 text-sm text-tinta-suave">
                        Contamos tus horas extra desde tu primer fichaje
                        ({new Date(primerFichaje + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}).
                        ¿Tenías horas acumuladas de antes?
                    </p>
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={estaBienAsi}
                            disabled={guardando}
                            className="flex-1 py-2.5 rounded-xl border border-linea bg-superficie text-sm font-medium disabled:opacity-60"
                        >
                            No, está bien así
                        </button>
                        <button
                            onClick={() => navigate('/bolsa?inicial=1')}
                            className="flex-1 py-2.5 rounded-xl bg-acento text-sobre-acento text-sm font-semibold"
                        >
                            Sí, añadir horas de antes
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}
