import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { extraDelDia, formatMinutos } from '../lib/schedule'
import type { Fichaje as FichajeType, HorarioDia } from '../lib/schedule'

interface Props {
    userId: string
    horariosPorDia: (HorarioDia | null)[]
}

function horaActual(): string {
    return new Date().toTimeString().slice(0, 5) // "HH:MM"
}

function fechaHoy(): string {
    return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

export default function Fichaje({ userId, horariosPorDia }: Props) {
    const [fichaje, setFichaje] = useState<FichajeType | null>(null)
    const [cargando, setCargando] = useState(true)
    const [editando, setEditando] = useState(false)
    const [entradaManual, setEntradaManual] = useState('')
    const [salidaManual, setSalidaManual] = useState('')
    const [editandoNota, setEditandoNota] = useState(false)
    const [notaManual, setNotaManual] = useState('')

    useEffect(() => {
        cargarFichajeHoy()
    }, [])

    async function cargarFichajeHoy() {
        setCargando(true)
        const { data } = await supabase
            .from('fichajes')
            .select('*')
            .eq('fecha', fechaHoy())
            .maybeSingle()
        setFichaje(data)
        setCargando(false)
    }

    async function marcarEntrada() {
        const { data, error } = await supabase
            .from('fichajes')
            .upsert(
                { user_id: userId, fecha: fechaHoy(), hora_entrada: horaActual() },
                { onConflict: 'user_id,fecha' }
            )
            .select()
            .single()
        if (!error) setFichaje(data)
    }

    async function marcarSalida() {
        const { data, error } = await supabase
            .from('fichajes')
            .update({ hora_salida: horaActual() })
            .eq('fecha', fechaHoy())
            .select()
            .single()
        if (!error) setFichaje(data)
    }

    function abrirEdicion() {
        setEntradaManual(fichaje?.hora_entrada?.slice(0, 5) || '')
        setSalidaManual(fichaje?.hora_salida?.slice(0, 5) || '')
        setEditando(true)
    }

    async function guardarEdicion() {
        const { data, error } = await supabase
            .from('fichajes')
            .upsert(
                {
                    user_id: userId,
                    fecha: fechaHoy(),
                    hora_entrada: entradaManual || null,
                    hora_salida: salidaManual || null,
                },
                { onConflict: 'user_id,fecha' }
            )
            .select()
            .single()
        if (!error) {
            setFichaje(data)
            setEditando(false)
        }
    }

    function abrirNota() {
        setNotaManual(fichaje?.nota || '')
        setEditandoNota(true)
    }

    async function guardarNota() {
        const { data, error } = await supabase
            .from('fichajes')
            .update({ nota: notaManual || null })
            .eq('fecha', fechaHoy())
            .select()
            .single()
        if (!error) {
            setFichaje(data)
            setEditandoNota(false)
        }
    }

    if (cargando) return <p>Cargando...</p>

    const hoy = new Date()
    const horarioHoy = horariosPorDia[hoy.getDay()]
    const extra = fichaje ? extraDelDia(fichaje, horarioHoy) : 0

    return (
        <div className="bg-slate-800 rounded-2xl p-5 mt-4">
            <h2 className="text-base font-medium capitalize mb-4">
                {hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>

            <div className="flex justify-around my-4">
                <div className="text-center">
                    <div className="text-xs text-slate-400">Entrada</div>
                    <div className="text-3xl font-semibold">{fichaje?.hora_entrada?.slice(0, 5) || '—'}</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-slate-400">Salida</div>
                    <div className="text-3xl font-semibold">{fichaje?.hora_salida?.slice(0, 5) || '—'}</div>
                </div>
            </div>

            {!editando && !fichaje?.hora_entrada && (
                <button
                    onClick={marcarEntrada}
                    className="w-full py-3.5 rounded-xl bg-sky-400 text-slate-900 font-semibold"
                >
                    Marcar entrada
                </button>
            )}
            {!editando && fichaje?.hora_entrada && !fichaje?.hora_salida && (
                <button
                    onClick={marcarSalida}
                    className="w-full py-3.5 rounded-xl bg-sky-400 text-slate-900 font-semibold"
                >
                    Marcar salida
                </button>
            )}
            {!editando && fichaje?.hora_entrada && fichaje?.hora_salida && (
                <div className={`text-center py-2.5 rounded-xl font-semibold ${extra >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    Extra de hoy: {formatMinutos(extra)}
                </div>
            )}

            {!editando && fichaje?.hora_entrada && !editandoNota && (
                <div className="mt-4">
                    {fichaje?.nota && (
                        <p className="text-sm text-slate-300 bg-slate-900 rounded-lg px-3 py-2 mb-2">{fichaje.nota}</p>
                    )}
                    <button
                        onClick={abrirNota}
                        className="w-full text-sm text-slate-400 hover:text-slate-200"
                    >
                        {fichaje?.nota ? 'Editar nota' : 'Añadir nota'}
                    </button>
                </div>
            )}

            {editandoNota && (
                <div className="mt-4 space-y-3">
                    <textarea
                        value={notaManual}
                        onChange={(e) => setNotaManual(e.target.value)}
                        placeholder="¿Por qué te quedaste hasta tarde?"
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    />
                    <div className="flex gap-2.5">
                        <button onClick={guardarNota} className="flex-1 py-2.5 rounded-xl bg-sky-400 text-slate-900 font-semibold">
                            Guardar
                        </button>
                        <button onClick={() => setEditandoNota(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-200">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {!editando ? (
                <button
                    onClick={abrirEdicion}
                    className="w-full mt-3 text-sm text-slate-400 hover:text-slate-200"
                >
                    Corregir horas
                </button>
            ) : (
                <div className="mt-4 space-y-3">
                    <div className="flex gap-3">
                        <label className="flex-1 text-xs text-slate-400">
                            Entrada
                            <input
                                type="time"
                                value={entradaManual}
                                onChange={(e) => setEntradaManual(e.target.value)}
                                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-base text-slate-100"
                            />
                        </label>
                        <label className="flex-1 text-xs text-slate-400">
                            Salida
                            <input
                                type="time"
                                value={salidaManual}
                                onChange={(e) => setSalidaManual(e.target.value)}
                                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-base text-slate-100"
                            />
                        </label>
                    </div>
                    <div className="flex gap-2.5">
                        <button onClick={guardarEdicion} className="flex-1 py-2.5 rounded-xl bg-sky-400 text-slate-900 font-semibold">
                            Guardar
                        </button>
                        <button onClick={() => setEditando(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-200">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}