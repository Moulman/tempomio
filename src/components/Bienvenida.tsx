import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { fechaLocal } from '../lib/schedule'
import type { HorarioDia } from '../lib/schedule'
import { leerHoras } from '../lib/bolsa'
import type { Bolsa } from '../lib/bolsa'
import HorarioBase from './HorarioBase'
import CampoHoras from './CampoHoras'
import { Marca } from './Iconos'

interface Props {
    session: Session
    nombre: string | null
    horariosPorDia: (HorarioDia | null)[]
    bolsa: Bolsa
    onPerfilActualizado: () => void
    onHorariosActualizados: () => void
}

// Primera vez en la app: nombre, horario base y punto de partida de la bolsa de horas.
// Termina al guardar el saldo inicial (aunque sea 0).
export default function Bienvenida({ session, nombre, horariosPorDia, bolsa, onPerfilActualizado, onHorariosActualizados }: Props) {
    const [paso, setPaso] = useState(1)
    const [valorNombre, setValorNombre] = useState(nombre || '')
    const [tieneHoras, setTieneHoras] = useState(false)
    const [horas, setHoras] = useState('')
    const [minutos, setMinutos] = useState('')
    const [negativo, setNegativo] = useState(false)
    const [fecha, setFecha] = useState(fechaLocal(new Date()))
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const tieneHorario = horariosPorDia.some((h) => h?.activo)

    async function guardarNombre() {
        if (valorNombre.trim() && valorNombre.trim() !== nombre) {
            setGuardando(true)
            const { error } = await supabase.from('perfiles').upsert({ id: session.user.id, nombre: valorNombre.trim() })
            setGuardando(false)
            if (error) return setError('No se pudo guardar el nombre. Inténtalo otra vez.')
            onPerfilActualizado()
        }
        setError(null)
        setPaso(2)
    }

    async function terminar(minutosIniciales: number) {
        setGuardando(true)
        setError(null)
        const ok = await bolsa.guardarInicial(minutosIniciales, fecha)
        setGuardando(false)
        if (!ok) setError('No se pudo guardar. Inténtalo otra vez.')
        // Si va bien, App deja de mostrar la bienvenida al recargar la bolsa
    }

    function guardarConHoras() {
        const m = leerHoras(horas, minutos)
        if (!m) return setError('Indica cuántas horas tienes acumuladas.')
        terminar(negativo ? -m : m)
    }

    return (
        <div className="min-h-screen bg-fondo text-tinta flex flex-col items-center px-4 py-10">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-between mb-8">
                    <Marca width={36} height={36} />
                    <span className="text-sm text-tinta-tenue">Paso {paso} de 3</span>
                </div>

                {paso === 1 && (
                    <section className="space-y-4">
                        <h1 className="text-2xl font-semibold">¡Te damos la bienvenida a TempoMio!</h1>
                        <p className="text-tinta-suave">Tres pasos rápidos para dejarlo todo listo. ¿Cómo te llamas?</p>
                        <input
                            type="text"
                            value={valorNombre}
                            onChange={(e) => setValorNombre(e.target.value)}
                            placeholder="Tu nombre"
                            autoFocus
                            className="w-full bg-superficie border border-linea rounded-xl px-4 py-3 text-base"
                        />
                        <button
                            onClick={guardarNombre}
                            disabled={guardando}
                            className="w-full py-3.5 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60"
                        >
                            Continuar
                        </button>
                    </section>
                )}

                {paso === 2 && (
                    <section className="space-y-4">
                        <h1 className="text-2xl font-semibold">Tu horario</h1>
                        <p className="text-tinta-suave">
                            Con él calculamos tus horas extra. Pulsa «Editar», pon tu entrada y salida de cada día
                            y marca «Libre» los días que no trabajas.
                        </p>
                        <HorarioBase userId={session.user.id} horariosPorDia={horariosPorDia} onActualizado={onHorariosActualizados} />
                        <button
                            onClick={() => setPaso(3)}
                            className="w-full py-3.5 rounded-xl bg-acento text-sobre-acento font-semibold"
                        >
                            {tieneHorario ? 'Continuar' : 'Lo pondré más tarde'}
                        </button>
                    </section>
                )}

                {paso === 3 && (
                    <section className="space-y-4">
                        <h1 className="text-2xl font-semibold">Tu bolsa de horas</h1>
                        <p className="text-tinta-suave">
                            Aquí se acumulan tus horas extra para usarlas cuando quieras salir antes o cogerte un día.
                            ¿Empiezas de cero o ya tienes horas acumuladas?
                        </p>

                        {!tieneHoras ? (
                            <div className="space-y-2">
                                <button
                                    onClick={() => terminar(0)}
                                    disabled={guardando}
                                    className="w-full py-3.5 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60"
                                >
                                    Empiezo de cero
                                </button>
                                <button
                                    onClick={() => setTieneHoras(true)}
                                    className="w-full py-3.5 rounded-xl border border-linea bg-superficie font-medium"
                                >
                                    Ya tengo horas acumuladas
                                </button>
                            </div>
                        ) : (
                            <div className="bg-superficie border border-linea rounded-2xl p-5 space-y-4">
                                <CampoHoras
                                    horas={horas}
                                    minutos={minutos}
                                    onHoras={setHoras}
                                    onMinutos={setMinutos}
                                    negativo={negativo}
                                    onNegativo={setNegativo}
                                    etiquetas={['Tengo a favor', 'Debo']}
                                />
                                <label className="block text-xs text-tinta-suave">
                                    A fecha de
                                    <input
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        className="block w-full mt-1 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                                    />
                                </label>
                                <div className="flex gap-2.5">
                                    <button
                                        onClick={guardarConHoras}
                                        disabled={guardando}
                                        className="flex-1 py-3 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60"
                                    >
                                        {guardando ? 'Guardando...' : 'Empezar'}
                                    </button>
                                    <button onClick={() => setTieneHoras(false)} className="flex-1 py-3 rounded-xl border border-linea">
                                        Atrás
                                    </button>
                                </div>
                            </div>
                        )}
                        <p className="text-xs text-tinta-tenue">Podrás cambiarlo cuando quieras en Bolsa de horas.</p>
                    </section>
                )}

                {error && <p className="mt-4 text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2">{error}</p>}

                {paso > 1 && (
                    <button onClick={() => setPaso(paso - 1)} className="mt-6 text-sm text-tinta-suave">
                        ‹ Volver
                    </button>
                )}
            </div>
        </div>
    )
}
