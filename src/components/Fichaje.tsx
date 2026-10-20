import { useState } from 'react'
import {
    extraDelDia, formatDuracion, formatMinutos, formatReloj, minutosTrabajados, segundosDesde,
} from '../lib/schedule'
import type { HorarioDia } from '../lib/schedule'
import { useAhora } from '../lib/fichajeHoy'
import type { FichajeHoy } from '../lib/fichajeHoy'

interface Props {
    fichajeHoy: FichajeHoy
    horariosPorDia: (HorarioDia | null)[]
}

const hhmm = (hora: string | null | undefined) => hora?.slice(0, 5) || '—'

// Cronómetro del día: entrada y salida con un toque, tiempo en vivo y extra frente al horario base
export default function Fichaje({ fichajeHoy, horariosPorDia }: Props) {
    const { fichaje, cargando, enCurso, marcarEntrada, marcarSalida, guardarHoras, guardarNota } = fichajeHoy
    const ahora = useAhora(enCurso)
    const [ocupado, setOcupado] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [editando, setEditando] = useState(false)
    const [entradaManual, setEntradaManual] = useState('')
    const [salidaManual, setSalidaManual] = useState('')
    const [editandoNota, setEditandoNota] = useState(false)
    const [notaManual, setNotaManual] = useState('')

    // Ejecuta una escritura evitando dobles toques; devuelve si fue bien
    async function guardar(accion: () => Promise<boolean>): Promise<boolean> {
        setOcupado(true)
        setError(null)
        const ok = await accion()
        setOcupado(false)
        if (!ok) setError('No se pudo guardar. Revisa la conexión e inténtalo otra vez.')
        return ok
    }

    function abrirEdicion() {
        setEntradaManual(fichaje?.hora_entrada?.slice(0, 5) || '')
        setSalidaManual(fichaje?.hora_salida?.slice(0, 5) || '')
        setEditandoNota(false)
        setEditando(true)
    }

    async function guardarEdicion() {
        if (await guardar(() => guardarHoras(entradaManual || null, salidaManual || null))) setEditando(false)
    }

    function abrirNota() {
        setNotaManual(fichaje?.nota || '')
        setEditando(false)
        setEditandoNota(true)
    }

    async function guardarEdicionNota() {
        if (await guardar(() => guardarNota(notaManual || null))) setEditandoNota(false)
    }

    if (cargando) {
        return <div className="bg-superficie border border-linea rounded-2xl h-72 animate-pulse" />
    }

    const hoy = new Date()
    const horario = horariosPorDia[hoy.getDay()]
    const teorico = horario?.activo ? minutosTrabajados(horario.hora_entrada, horario.hora_salida) : 0
    const terminado = !!fichaje?.hora_entrada && !!fichaje?.hora_salida

    // Tiempo trabajado: en vivo mientras corre, cerrado al marcar salida
    const segundos = enCurso && fichaje?.hora_entrada
        ? segundosDesde(fichaje.hora_entrada, ahora)
        : terminado ? minutosTrabajados(fichaje!.hora_entrada, fichaje!.hora_salida) * 60 : 0
    const minutos = Math.floor(segundos / 60)
    const extra = terminado ? extraDelDia(fichaje!, horario) : minutos - teorico
    const progreso = teorico > 0 ? Math.min(100, (minutos / teorico) * 100) : 0

    const estado = enCurso ? 'En turno' : terminado ? 'Jornada terminada' : 'Sin fichar'
    // "Martes, 20 de octubre": solo la primera letra en mayúscula (capitalize la pondría en cada palabra)
    const fecha = hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    const fechaLarga = fecha.charAt(0).toUpperCase() + fecha.slice(1)

    return (
        <section className="bg-superficie border border-linea rounded-2xl p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-medium">
                    {fechaLarga}
                </h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${enCurso
                    ? 'bg-acento/10 text-acento'
                    : 'bg-realce text-tinta-suave'}`}
                >
                    {enCurso && <span className="w-1.5 h-1.5 rounded-full bg-acento animate-pulse" />}
                    {estado}
                </span>
            </div>

            {/* ---------- Reloj ---------- */}
            <p className={`mt-6 text-center text-6xl font-semibold tabular-nums tracking-tight ${segundos === 0 ? 'text-tinta-tenue' : ''}`}>
                {formatReloj(segundos)}
            </p>
            <p className="mt-2 text-center text-sm text-tinta-suave tabular-nums">
                Entrada {hhmm(fichaje?.hora_entrada)} · Salida {hhmm(fichaje?.hora_salida)}
            </p>

            {/* ---------- Progreso frente al horario ---------- */}
            <div className="mt-6">
                {teorico > 0 ? (
                    <>
                        <div className="h-2 rounded-full bg-realce overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-[width] duration-700 ${extra > 0 ? 'bg-positivo' : 'bg-acento'}`}
                                style={{ width: `${progreso}%` }}
                            />
                        </div>
                        <div className="mt-2 flex justify-between gap-3 text-sm">
                            <span className="text-tinta-suave tabular-nums">
                                Horario {hhmm(horario?.hora_entrada)}–{hhmm(horario?.hora_salida)}
                            </span>
                            {(enCurso || terminado) && (
                                <span className={`font-medium tabular-nums ${extra > 0 ? 'text-positivo' : extra < 0 && terminado ? 'text-negativo' : 'text-tinta-suave'}`}>
                                    {enCurso && extra < 0 ? `Quedan ${formatDuracion(extra)}` : `Extra ${formatMinutos(extra)}`}
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-tinta-suave text-center">
                        Hoy no tienes horario: todo lo que fiches cuenta como extra.
                    </p>
                )}
            </div>

            {/* ---------- Botón principal ---------- */}
            {!editando && !fichaje?.hora_entrada && (
                <button
                    onClick={() => guardar(marcarEntrada)}
                    disabled={ocupado}
                    className="mt-6 w-full py-4 rounded-xl bg-acento text-sobre-acento text-lg font-semibold active:scale-[0.99] transition disabled:opacity-60"
                >
                    Marcar entrada
                </button>
            )}
            {!editando && enCurso && (
                <button
                    onClick={() => guardar(marcarSalida)}
                    disabled={ocupado}
                    className="mt-6 w-full py-4 rounded-xl bg-tinta text-superficie text-lg font-semibold active:scale-[0.99] transition disabled:opacity-60"
                >
                    Marcar salida
                </button>
            )}

            {error && (
                <p className="mt-3 text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* ---------- Nota ---------- */}
            {fichaje?.nota && !editandoNota && (
                <p className="mt-4 text-sm bg-fondo rounded-lg px-3 py-2 whitespace-pre-line">{fichaje.nota}</p>
            )}

            {editandoNota && (
                <div className="mt-4 space-y-3">
                    <textarea
                        value={notaManual}
                        onChange={(e) => setNotaManual(e.target.value)}
                        placeholder="¿Algo que recordar de hoy?"
                        rows={2}
                        autoFocus
                        className="w-full bg-fondo border border-linea rounded-lg px-3 py-2 text-base"
                    />
                    <div className="flex gap-2.5">
                        <button onClick={guardarEdicionNota} disabled={ocupado} className="flex-1 py-2.5 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60">
                            Guardar
                        </button>
                        <button onClick={() => setEditandoNota(false)} className="flex-1 py-2.5 rounded-xl border border-linea">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* ---------- Corregir horas (modo manual) ---------- */}
            {editando && (
                <div className="mt-6 space-y-3">
                    <div className="flex gap-3">
                        <label className="flex-1 text-xs text-tinta-suave">
                            Entrada
                            <input
                                type="time"
                                value={entradaManual}
                                onChange={(e) => setEntradaManual(e.target.value)}
                                className="w-full mt-1 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                            />
                        </label>
                        <label className="flex-1 text-xs text-tinta-suave">
                            Salida
                            <input
                                type="time"
                                value={salidaManual}
                                onChange={(e) => setSalidaManual(e.target.value)}
                                className="w-full mt-1 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                            />
                        </label>
                    </div>
                    <div className="flex gap-2.5">
                        <button onClick={guardarEdicion} disabled={ocupado} className="flex-1 py-2.5 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60">
                            Guardar
                        </button>
                        <button onClick={() => setEditando(false)} className="flex-1 py-2.5 rounded-xl border border-linea">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {!editando && !editandoNota && (
                <div className="mt-4 flex justify-center gap-6 text-sm">
                    {fichaje?.hora_entrada && (
                        <button onClick={abrirNota} className="text-tinta-suave hover:text-tinta">
                            {fichaje.nota ? 'Editar nota' : 'Añadir nota'}
                        </button>
                    )}
                    <button onClick={abrirEdicion} className="text-tinta-suave hover:text-tinta">
                        Corregir horas
                    </button>
                </div>
            )}
        </section>
    )
}
