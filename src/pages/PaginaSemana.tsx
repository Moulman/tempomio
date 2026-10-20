import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import {
    diasDeSemana, extraDelDia, fechaLarga, fechaLocal, formatDuracion, formatMinutos, lunesDeSemana,
    minutosTrabajados, sumarDias,
} from '../lib/schedule'
import type { Fichaje, HorarioDia } from '../lib/schedule'
import EditorDia from '../components/EditorDia'

interface Props {
    session: Session
    horariosPorDia: (HorarioDia | null)[]
    // Avisa a la app de que ha cambiado un día (por si es hoy y corre el cronómetro)
    onDiaGuardado: () => void
}

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const hhmm = (hora: string | null | undefined) => hora?.slice(0, 5) || '—'

// "20 – 26 oct" o "27 oct – 2 nov"
function rangoSemana(lunes: string): string {
    const ini = new Date(lunes + 'T00:00:00')
    const fin = new Date(sumarDias(lunes, 6) + 'T00:00:00')
    const mes = (d: Date) => d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')
    return ini.getMonth() === fin.getMonth()
        ? `${ini.getDate()} – ${fin.getDate()} ${mes(fin)}`
        : `${ini.getDate()} ${mes(ini)} – ${fin.getDate()} ${mes(fin)}`
}

// Vista semanal tipo timesheet: un día por fila (un fichaje por día), con totales frente al horario base
export default function PaginaSemana({ session, horariosPorDia, onDiaGuardado }: Props) {
    const hoy = fechaLocal(new Date())
    const lunesActual = lunesDeSemana(new Date())
    const [lunes, setLunes] = useState(lunesActual)
    const [fichajes, setFichajes] = useState<Record<string, Fichaje>>({})
    const [cargado, setCargado] = useState(false)
    const [diaSel, setDiaSel] = useState<string | null>(null)
    const [rellenando, setRellenando] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Se incrementa tras guardar para volver a cargar la semana
    const [recarga, setRecarga] = useState(0)

    const dias = diasDeSemana(lunes)

    useEffect(() => {
        let cancelado = false
        supabase
            .from('fichajes')
            .select('*')
            .eq('user_id', session.user.id)
            .gte('fecha', lunes)
            .lte('fecha', sumarDias(lunes, 6))
            .then(({ data }) => {
                if (cancelado) return
                const porFecha: Record<string, Fichaje> = {}
                for (const f of data || []) porFecha[f.fecha] = f
                setFichajes(porFecha)
                setCargado(true)
            })
        return () => { cancelado = true }
    }, [lunes, session.user.id, recarga])

    function cambiarSemana(nuevoLunes: string) {
        setLunes(nuevoLunes)
        setDiaSel(null)
        setError(null)
    }

    function diaGuardado() {
        setRecarga((n) => n + 1)
        setDiaSel(null)
        onDiaGuardado()
    }

    const horarioDe = (fecha: string) => {
        const h = horariosPorDia[new Date(fecha + 'T00:00:00').getDay()]
        return h?.activo ? h : null
    }

    // Días ya pasados de esta semana, con horario y sin nada fichado: se pueden rellenar con el horario base
    const rellenables = dias.filter((fecha) => {
        const f = fichajes[fecha]
        return fecha < hoy && horarioDe(fecha) && !f?.hora_entrada && !f?.hora_salida
    })

    async function rellenarConHorario() {
        const n = rellenables.length
        if (!confirm(`¿Rellenar ${n} ${n === 1 ? 'día' : 'días'} sin fichar con tu horario base?`)) return
        setRellenando(true)
        setError(null)
        const { error } = await supabase
            .from('fichajes')
            .upsert(
                rellenables.map((fecha) => {
                    const h = horarioDe(fecha)!
                    return { user_id: session.user.id, fecha, hora_entrada: h.hora_entrada, hora_salida: h.hora_salida }
                }),
                { onConflict: 'user_id,fecha' }
            )
        setRellenando(false)
        if (error) {
            setError('No se pudo rellenar la semana. Inténtalo otra vez.')
            return
        }
        setRecarga((n) => n + 1)
    }

    // ---------- Totales ----------
    let trabajado = 0
    let extra = 0
    let previsto = 0
    for (const fecha of dias) {
        const h = horarioDe(fecha)
        if (h) previsto += minutosTrabajados(h.hora_entrada, h.hora_salida)
        const f = fichajes[fecha]
        if (f?.hora_entrada && f?.hora_salida) {
            trabajado += minutosTrabajados(f.hora_entrada, f.hora_salida)
            extra += extraDelDia(f, h)
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-10">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h1 className="text-2xl font-semibold">Semana</h1>
                {lunes !== lunesActual && (
                    <button onClick={() => cambiarSemana(lunesActual)} className="text-sm text-acento hover:opacity-80">
                        Ir a esta semana
                    </button>
                )}
            </div>

            {/* ---------- Selector de semana ---------- */}
            <div className="flex items-center bg-superficie border border-linea rounded-xl mb-4">
                <button
                    onClick={() => cambiarSemana(sumarDias(lunes, -7))}
                    aria-label="Semana anterior"
                    className="px-4 py-3 text-xl text-tinta-suave hover:text-tinta"
                >
                    ‹
                </button>
                <div className="flex-1 text-center">
                    <p className="font-medium">{rangoSemana(lunes)}</p>
                    {lunes === lunesActual && <p className="text-xs text-tinta-tenue">Esta semana</p>}
                </div>
                <button
                    onClick={() => cambiarSemana(sumarDias(lunes, 7))}
                    aria-label="Semana siguiente"
                    className="px-4 py-3 text-xl text-tinta-suave hover:text-tinta"
                >
                    ›
                </button>
            </div>

            {/* ---------- Totales ---------- */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                    { titulo: 'Trabajado', valor: formatDuracion(trabajado), color: '' },
                    { titulo: 'Previsto', valor: formatDuracion(previsto), color: '' },
                    {
                        titulo: 'Extra',
                        valor: formatMinutos(extra),
                        color: extra > 0 ? 'text-positivo' : extra < 0 ? 'text-negativo' : '',
                    },
                ].map((t) => (
                    <div key={t.titulo} className="bg-superficie border border-linea rounded-xl px-3 py-3">
                        <p className="text-xs text-tinta-suave">{t.titulo}</p>
                        <p className={`mt-0.5 text-lg font-semibold tabular-nums ${t.color}`}>{t.valor}</p>
                    </div>
                ))}
            </div>

            {/* ---------- Días ---------- */}
            <ul className={`bg-superficie border border-linea rounded-xl divide-y divide-linea ${cargado ? '' : 'opacity-60'}`}>
                {dias.map((fecha) => {
                    const d = new Date(fecha + 'T00:00:00')
                    const f = fichajes[fecha]
                    const h = horarioDe(fecha)
                    const completo = !!f?.hora_entrada && !!f?.hora_salida
                    const enCurso = fecha === hoy && !!f?.hora_entrada && !f?.hora_salida
                    const extraDia = completo ? extraDelDia(f!, h) : 0
                    const futuro = fecha > hoy
                    const abierto = diaSel === fecha

                    let detalle: string
                    if (completo || enCurso) detalle = `${hhmm(f!.hora_entrada)} – ${hhmm(f!.hora_salida)}`
                    else if (!h) detalle = 'Libre'
                    else if (futuro || fecha === hoy) detalle = `Horario ${hhmm(h.hora_entrada)} – ${hhmm(h.hora_salida)}`
                    else detalle = 'Sin fichar'

                    return (
                        <li key={fecha}>
                            <button
                                onClick={() => setDiaSel(abierto ? null : fecha)}
                                aria-expanded={abierto}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${fecha === hoy ? 'bg-acento/5' : ''}`}
                            >
                                <div className="w-11 shrink-0 text-center">
                                    <p className={`text-xs ${fecha === hoy ? 'text-acento font-semibold' : 'text-tinta-tenue'}`}>
                                        {DIAS_CORTOS[d.getDay()]}
                                    </p>
                                    <p className={`text-lg font-semibold leading-tight ${fecha === hoy ? 'text-acento' : ''}`}>
                                        {d.getDate()}
                                    </p>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm tabular-nums ${completo || enCurso ? '' : detalle === 'Sin fichar' ? 'text-negativo' : 'text-tinta-tenue'}`}>
                                        {detalle}
                                    </p>
                                    {f?.nota && <p className="text-xs text-tinta-suave truncate mt-0.5">{f.nota}</p>}
                                </div>

                                <div className="text-right shrink-0">
                                    {completo && (
                                        <>
                                            <p className="text-sm font-semibold tabular-nums">
                                                {formatDuracion(minutosTrabajados(f!.hora_entrada, f!.hora_salida))}
                                            </p>
                                            <p className={`text-xs font-medium tabular-nums ${extraDia > 0 ? 'text-positivo' : extraDia < 0 ? 'text-negativo' : 'text-tinta-tenue'}`}>
                                                {formatMinutos(extraDia)}
                                            </p>
                                        </>
                                    )}
                                    {enCurso && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-acento">
                                            <span className="w-1.5 h-1.5 rounded-full bg-acento animate-pulse" />
                                            En turno
                                        </span>
                                    )}
                                </div>
                            </button>

                            {abierto && (
                                <div className="px-4 pb-4">
                                    <p className="text-sm font-medium mb-3">{fechaLarga(d)}</p>
                                    <EditorDia
                                        key={fecha}
                                        userId={session.user.id}
                                        fecha={fecha}
                                        fichaje={f}
                                        onGuardado={diaGuardado}
                                        onCancelar={() => setDiaSel(null)}
                                    />
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>

            {error && <p className="mt-4 text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2">{error}</p>}

            {/* ---------- Rellenar con el horario base ---------- */}
            {cargado && rellenables.length > 0 && (
                <div className="mt-4 bg-superficie border border-linea rounded-xl p-4 flex items-center gap-4">
                    <p className="flex-1 text-sm text-tinta-suave">
                        {rellenables.length === 1 ? 'Hay 1 día pasado' : `Hay ${rellenables.length} días pasados`} sin fichar.
                        Puedes rellenarlos con tu horario base.
                    </p>
                    <button
                        onClick={rellenarConHorario}
                        disabled={rellenando}
                        className="shrink-0 px-4 py-2.5 rounded-xl border border-acento text-acento text-sm font-semibold disabled:opacity-60"
                    >
                        {rellenando ? 'Rellenando...' : 'Rellenar'}
                    </button>
                </div>
            )}
        </div>
    )
}
