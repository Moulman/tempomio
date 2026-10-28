import { useState } from 'react'
import { supabase } from '../supabaseClient'
import type { HorarioDia } from '../lib/schedule'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface Props {
    userId: string
    horariosPorDia: (HorarioDia | null)[]
    onActualizado: () => void
}

interface BorradorDia {
    dia_semana: number
    hora_entrada: string
    hora_salida: string
    // Día de descanso: no se guarda fila. Las horas se conservan en el borrador
    // para poder recuperarlas si se desmarca sin querer.
    libre: boolean
}

export default function HorarioBase({ userId, horariosPorDia, onActualizado }: Props) {
    const [editando, setEditando] = useState(false)

    const [borrador, setBorrador] = useState<BorradorDia[]>([])
    const [error, setError] = useState<string | null>(null)
    const [guardando, setGuardando] = useState(false)

    // El borrador se crea al abrir la edición, cuando los horarios ya están cargados
    function abrirEdicion() {
        setBorrador(
            horariosPorDia.map((h, i) => ({
                dia_semana: i,
                hora_entrada: h?.hora_entrada?.slice(0, 5) || '',
                hora_salida: h?.hora_salida?.slice(0, 5) || '',
                libre: !h,
            }))
        )
        setError(null)
        setEditando(true)
    }

    async function guardar() {
        const incompleto = borrador.find((d) => !d.libre && !!d.hora_entrada !== !!d.hora_salida)
        if (incompleto) {
            setError(`Falta la hora de ${incompleto.hora_entrada ? 'salida' : 'entrada'} del ${DIAS[incompleto.dia_semana].toLowerCase()}.`)
            return
        }

        // Un día sin marcar como libre pero sin horas también cuenta como libre
        const esLibre = (d: BorradorDia) => d.libre || (!d.hora_entrada && !d.hora_salida)

        const filas = borrador
            .filter((d) => !esLibre(d))
            .map((d) => ({
                user_id: userId,
                dia_semana: d.dia_semana,
                hora_entrada: d.hora_entrada,
                hora_salida: d.hora_salida,
                activo: true,
            }))

        // Días libres → se borran para que queden como "Libre"
        const diasLibres = borrador
            .filter(esLibre)
            .map((d) => d.dia_semana)

        setGuardando(true)
        const [{ error: errorUpsert }, { error: errorDelete }] = await Promise.all([
            filas.length > 0
                ? supabase.from('horarios_base').upsert(filas, { onConflict: 'user_id,dia_semana' })
                : Promise.resolve({ error: null }),
            diasLibres.length > 0
                ? supabase.from('horarios_base').delete().eq('user_id', userId).in('dia_semana', diasLibres)
                : Promise.resolve({ error: null }),
        ])
        setGuardando(false)

        if (errorUpsert || errorDelete) {
            setError('No se pudo guardar el horario. Inténtalo de nuevo.')
            return
        }
        setEditando(false)
        onActualizado()
    }

    function cambiarHora(indice: number, campo: 'hora_entrada' | 'hora_salida', valor: string) {
        const nuevo = [...borrador]
        nuevo[indice] = { ...nuevo[indice], [campo]: valor }
        setBorrador(nuevo)
    }

    function alternarLibre(indice: number) {
        const nuevo = [...borrador]
        nuevo[indice] = { ...nuevo[indice], libre: !nuevo[indice].libre }
        setBorrador(nuevo)
        setError(null)
    }

    // ---------- Modo vista ----------
    if (!editando) {
        return (
            <div className="bg-superficie border border-linea rounded-xl p-5">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-medium">Horario base</h3>
                    <button
                        onClick={abrirEdicion}
                        className="text-sm text-acento hover:opacity-80"
                    >
                        Editar
                    </button>
                </div>
                <ul>
                    {DIAS.map((nombre, i) => {
                        const h = horariosPorDia[i]
                        return (
                            <li key={i} className="flex justify-between py-2 border-b border-linea last:border-0 text-sm">
                                <span>{nombre}</span>
                                <span className={h ? 'text-tinta' : 'text-tinta-tenue'}>
                                    {h ? `${h.hora_entrada.slice(0, 5)} – ${h.hora_salida.slice(0, 5)}` : 'Libre'}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            </div>
        )
    }

    // ---------- Modo edición ----------
    return (
        <div className="bg-superficie border border-linea rounded-xl p-5">
            <h3 className="text-base font-medium mb-3">Editar horario base</h3>
            {DIAS.map((nombre, i) => {
                const d = borrador[i]
                const dia = nombre.toLowerCase()
                return (
                    <div key={i} className="flex flex-wrap items-center gap-2 py-2 border-b border-linea last:border-0">
                        <span className="text-sm w-24">{nombre}</span>
                        <div className="flex flex-1 items-center justify-end gap-2">
                            {d.libre ? (
                                <span className="text-sm text-tinta-tenue">Libre</span>
                            ) : (
                                <>
                                    <input
                                        type="time"
                                        value={d.hora_entrada}
                                        onChange={(e) => cambiarHora(i, 'hora_entrada', e.target.value)}
                                        aria-label={`Entrada ${dia}`}
                                        className="bg-fondo border border-linea rounded-lg px-2 py-1 text-sm"
                                    />
                                    <input
                                        type="time"
                                        value={d.hora_salida}
                                        onChange={(e) => cambiarHora(i, 'hora_salida', e.target.value)}
                                        aria-label={`Salida ${dia}`}
                                        className="bg-fondo border border-linea rounded-lg px-2 py-1 text-sm"
                                    />
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => alternarLibre(i)}
                                aria-label={d.libre ? `Añadir horario el ${dia}` : `Marcar ${dia} como libre`}
                                className="px-2.5 py-1 rounded-lg border border-linea text-xs text-tinta-suave hover:text-tinta"
                            >
                                {d.libre ? 'Añadir horario' : 'Libre'}
                            </button>
                        </div>
                    </div>
                )
            })}
            <p className="text-xs text-tinta-tenue mt-2">Pulsa «Libre» en los días que no trabajas.</p>
            {error && (
                <p className="text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2 mt-3">{error}</p>
            )}
            <div className="flex gap-2.5 mt-4">
                <button onClick={guardar} disabled={guardando} className="flex-1 py-2.5 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60">
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => setEditando(false)} className="flex-1 py-2.5 rounded-xl border border-linea text-tinta">
                    Cancelar
                </button>
            </div>
        </div>
    )
}