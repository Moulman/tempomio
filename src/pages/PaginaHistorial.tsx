import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { generarCalendario, extraDelDia } from '../lib/schedule'
import type { Fichaje, HorarioDia } from '../lib/schedule'

interface Props {
    session: Session
    horariosPorDia: (HorarioDia | null)[]
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export default function PaginaHistorial({ session, horariosPorDia }: Props) {
    const hoy = new Date()
    const [anio, setAnio] = useState(hoy.getFullYear())
    const [mes, setMes] = useState(hoy.getMonth())
    const [fichajes, setFichajes] = useState<Record<string, Fichaje>>({})

    // Día seleccionado y sus horas en edición
    const [diaSel, setDiaSel] = useState<string | null>(null)
    const [entradaManual, setEntradaManual] = useState('')
    const [salidaManual, setSalidaManual] = useState('')
    const [notaManual, setNotaManual] = useState('')
    const [guardando, setGuardando] = useState(false)

    useEffect(() => {
        cargarFichajesMes()
    }, [anio, mes])

    async function cargarFichajesMes() {
        const desde = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
        const ultimoDia = new Date(anio, mes + 1, 0).getDate()
        const hasta = `${anio}-${String(mes + 1).padStart(2, '0')}-${ultimoDia}`

        const { data } = await supabase
            .from('fichajes')
            .select('*')
            .gte('fecha', desde)
            .lte('fecha', hasta)

        const porFecha: Record<string, Fichaje> = {}
        for (const f of data || []) porFecha[f.fecha] = f
        setFichajes(porFecha)
    }

    function seleccionarDia(fecha: string) {
        setDiaSel(fecha)
        const f = fichajes[fecha]
        setEntradaManual(f?.hora_entrada?.slice(0, 5) || '')
        setSalidaManual(f?.hora_salida?.slice(0, 5) || '')
        setNotaManual(f?.nota || '')
    }

    async function guardarDia() {
        if (!diaSel) return
        setGuardando(true)
        const { error } = await supabase
            .from('fichajes')
            .upsert(
                {
                    user_id: session.user.id,
                    fecha: diaSel,
                    hora_entrada: entradaManual || null,
                    hora_salida: salidaManual || null,
                    nota: notaManual || null,
                },
                { onConflict: 'user_id,fecha' }
            )
        setGuardando(false)
        if (!error) {
            await cargarFichajesMes()
            setDiaSel(null)
        }
    }

    function mesAnterior() {
        if (mes === 0) { setMes(11); setAnio(anio - 1) }
        else setMes(mes - 1)
        setDiaSel(null)
    }

    function mesSiguiente() {
        if (mes === 11) { setMes(0); setAnio(anio + 1) }
        else setMes(mes + 1)
        setDiaSel(null)
    }

    const celdas = generarCalendario(anio, mes)

    return (
        <div className="max-w-md mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Historial</h1>
                <Link to="/" className="text-sm text-sky-400 hover:text-sky-300">← Volver</Link>
            </div>

            <div className="bg-slate-800 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={mesAnterior} className="px-3 py-1 rounded-lg text-slate-400 hover:text-slate-100">‹</button>
                    <span className="font-medium capitalize">{MESES[mes]} {anio}</span>
                    <button onClick={mesSiguiente} className="px-3 py-1 rounded-lg text-slate-400 hover:text-slate-100">›</button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                    {DIAS_SEMANA.map((d) => (
                        <div key={d} className="text-center text-xs text-slate-500 py-1">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {celdas.map((fecha, i) => {
                        if (!fecha) return <div key={i} />
                        const dia = Number(fecha.slice(8, 10))
                        const fichaje = fichajes[fecha]
                        const tieneFichaje = fichaje?.hora_entrada && fichaje?.hora_salida
                        const fechaObj = new Date(fecha + 'T00:00:00')
                        const extra = tieneFichaje ? extraDelDia(fichaje, horariosPorDia[fechaObj.getDay()]) : 0
                        const seleccionado = diaSel === fecha

                        return (
                            <button
                                key={fecha}
                                onClick={() => seleccionarDia(fecha)}
                                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm
                  ${seleccionado ? 'ring-2 ring-sky-400' : ''}
                  ${tieneFichaje
                                        ? extra >= 0 ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
                                        : 'bg-slate-900 text-slate-400'}`}
                            >
                                <span>{dia}</span>
                                {fichaje?.nota && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-400" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Panel de edición del día seleccionado */}
            {diaSel && (
                <div className="bg-slate-800 rounded-2xl p-5 mt-4">
                    <h3 className="text-base font-medium mb-3">
                        {new Date(diaSel + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <div className="flex gap-3 mb-4">
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
                    <label className="block text-xs text-slate-400 mb-4">
                        Nota
                        <textarea
                            value={notaManual}
                            onChange={(e) => setNotaManual(e.target.value)}
                            placeholder="Motivo (opcional)"
                            rows={2}
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-100"
                        />
                    </label>
                    <div className="flex gap-2.5">
                        <button onClick={guardarDia} disabled={guardando} className="flex-1 py-2.5 rounded-xl bg-sky-400 text-slate-900 font-semibold">
                            {guardando ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => setDiaSel(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-200">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}