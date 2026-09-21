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
}

export default function HorarioBase({ userId, horariosPorDia, onActualizado }: Props) {
    const [editando, setEditando] = useState(false)

    const [borrador, setBorrador] = useState<BorradorDia[]>(() =>
        horariosPorDia.map((h, i) => ({
            dia_semana: i,
            hora_entrada: h?.hora_entrada?.slice(0, 5) || '',
            hora_salida: h?.hora_salida?.slice(0, 5) || '',
        }))
    )

    async function guardar() {
        const filas = borrador
            .filter((d) => d.hora_entrada && d.hora_salida)
            .map((d) => ({
                user_id: userId,
                dia_semana: d.dia_semana,
                hora_entrada: d.hora_entrada,
                hora_salida: d.hora_salida,
                activo: true,
            }))

        const { error } = await supabase
            .from('horarios_base')
            .upsert(filas, { onConflict: 'user_id,dia_semana' })

        if (!error) {
            setEditando(false)
            onActualizado()
        }
    }

    function cambiarHora(indice: number, campo: 'hora_entrada' | 'hora_salida', valor: string) {
        const nuevo = [...borrador]
        nuevo[indice] = { ...nuevo[indice], [campo]: valor }
        setBorrador(nuevo)
    }

    // ---------- Modo vista ----------
    if (!editando) {
        return (
            <div className="bg-slate-800 rounded-2xl p-5 mt-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-medium">Horario base</h3>
                    <button
                        onClick={() => setEditando(true)}
                        className="text-sm text-sky-400 hover:text-sky-300"
                    >
                        Editar
                    </button>
                </div>
                <ul>
                    {DIAS.map((nombre, i) => {
                        const h = horariosPorDia[i]
                        return (
                            <li key={i} className="flex justify-between py-2 border-b border-slate-700 last:border-0 text-sm">
                                <span>{nombre}</span>
                                <span className={h ? 'text-slate-200' : 'text-slate-500'}>
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
        <div className="bg-slate-800 rounded-2xl p-5 mt-4">
            <h3 className="text-base font-medium mb-3">Editar horario base</h3>
            {DIAS.map((nombre, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 py-1.5">
                    <span className="text-sm">{nombre}</span>
                    <input
                        type="time"
                        value={borrador[i].hora_entrada}
                        onChange={(e) => cambiarHora(i, 'hora_entrada', e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm"
                    />
                    <input
                        type="time"
                        value={borrador[i].hora_salida}
                        onChange={(e) => cambiarHora(i, 'hora_salida', e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm"
                    />
                </div>
            ))}
            <div className="flex gap-2.5 mt-4">
                <button onClick={guardar} className="flex-1 py-2.5 rounded-xl bg-sky-400 text-slate-900 font-semibold">
                    Guardar
                </button>
                <button onClick={() => setEditando(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-200">
                    Cancelar
                </button>
            </div>
        </div>
    )
}