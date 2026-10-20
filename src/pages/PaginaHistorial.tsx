import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { generarCalendario, extraDelDia, fechaLarga, formatDuracion, formatMinutos, minutosTrabajados } from '../lib/schedule'
import type { Fichaje, HorarioDia } from '../lib/schedule'
import EditorDia from '../components/EditorDia'
import { csvDelMes, descargarArchivo } from '../lib/csv'

interface Props {
    session: Session
    horariosPorDia: (HorarioDia | null)[]
    // Avisa a la app de que ha cambiado un día (por si es hoy y corre el cronómetro)
    onDiaGuardado: () => void
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export default function PaginaHistorial({ session, horariosPorDia, onDiaGuardado }: Props) {
    const hoy = new Date()
    const [anio, setAnio] = useState(hoy.getFullYear())
    const [mes, setMes] = useState(hoy.getMonth())
    const [fichajes, setFichajes] = useState<Record<string, Fichaje>>({})

    // Día seleccionado para editar
    const [diaSel, setDiaSel] = useState<string | null>(null)
    // Se incrementa tras guardar un día para volver a cargar el mes
    const [recarga, setRecarga] = useState(0)

    useEffect(() => {
        let cancelado = false
        const desde = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
        const ultimoDia = new Date(anio, mes + 1, 0).getDate()
        const hasta = `${anio}-${String(mes + 1).padStart(2, '0')}-${ultimoDia}`

        supabase
            .from('fichajes')
            .select('*')
            .eq('user_id', session.user.id)
            .gte('fecha', desde)
            .lte('fecha', hasta)
            .then(({ data }) => {
                if (cancelado) return
                const porFecha: Record<string, Fichaje> = {}
                for (const f of data || []) porFecha[f.fecha] = f
                setFichajes(porFecha)
            })
        return () => { cancelado = true }
    }, [anio, mes, session.user.id, recarga])

    function diaGuardado() {
        setRecarga((n) => n + 1)
        setDiaSel(null)
        onDiaGuardado()
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

    // Totales del mes (solo días con entrada y salida)
    let trabajadoMes = 0
    let extraMes = 0
    for (const f of Object.values(fichajes)) {
        if (!f.hora_entrada || !f.hora_salida) continue
        trabajadoMes += minutosTrabajados(f.hora_entrada, f.hora_salida)
        extraMes += extraDelDia(f, horariosPorDia[new Date(f.fecha + 'T00:00:00').getDay()])
    }
    const hayFichajes = Object.keys(fichajes).length > 0

    function descargarCsv() {
        const nombre = `tempomio-${anio}-${String(mes + 1).padStart(2, '0')}.csv`
        descargarArchivo(nombre, csvDelMes(Object.values(fichajes), horariosPorDia))
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8">
            <div className="flex justify-between items-center gap-3 mb-4">
                <h1 className="text-2xl font-semibold">Historial</h1>
                <button
                    onClick={descargarCsv}
                    disabled={!hayFichajes}
                    className="px-3.5 py-2 rounded-lg border border-linea bg-superficie text-sm font-medium hover:border-tinta-tenue disabled:opacity-50"
                >
                    Descargar CSV
                </button>
            </div>

            {/* ---------- Totales del mes ---------- */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-superficie border border-linea rounded-xl px-4 py-3">
                    <p className="text-xs text-tinta-suave">Trabajado en {MESES[mes]}</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatDuracion(trabajadoMes)}</p>
                </div>
                <div className="bg-superficie border border-linea rounded-xl px-4 py-3">
                    <p className="text-xs text-tinta-suave">Extra en {MESES[mes]}</p>
                    <p className={`mt-0.5 text-lg font-semibold tabular-nums ${extraMes > 0 ? 'text-positivo' : extraMes < 0 ? 'text-negativo' : ''}`}>
                        {formatMinutos(extraMes)}
                    </p>
                </div>
            </div>

            <div className="bg-superficie border border-linea rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={mesAnterior} className="px-3 py-1 rounded-lg text-tinta-suave hover:text-tinta">‹</button>
                    <span className="font-medium capitalize">{MESES[mes]} {anio}</span>
                    <button onClick={mesSiguiente} className="px-3 py-1 rounded-lg text-tinta-suave hover:text-tinta">›</button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                    {DIAS_SEMANA.map((d) => (
                        <div key={d} className="text-center text-xs text-tinta-tenue py-1">{d}</div>
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
                                onClick={() => setDiaSel(fecha)}
                                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm
                  ${seleccionado ? 'ring-2 ring-acento' : ''}
                  ${tieneFichaje
                                        ? extra >= 0 ? 'bg-positivo/15 text-positivo' : 'bg-negativo/15 text-negativo'
                                        : 'bg-fondo text-tinta-suave'}`}
                            >
                                <span>{dia}</span>
                                {fichaje?.nota && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-acento" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Panel de edición del día seleccionado */}
            {diaSel && (
                <div className="bg-superficie border border-linea rounded-xl p-5 mt-4">
                    <h3 className="text-base font-medium mb-3">
                        {fechaLarga(new Date(diaSel + 'T00:00:00'))}
                    </h3>
                    <EditorDia
                        key={diaSel}
                        userId={session.user.id}
                        fecha={diaSel}
                        fichaje={fichajes[diaSel]}
                        onGuardado={diaGuardado}
                        onCancelar={() => setDiaSel(null)}
                    />
                </div>
            )}
        </div>
    )
}