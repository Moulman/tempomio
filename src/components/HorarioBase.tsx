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

    // Estado inicial del formulario, a partir de los horarios actuales
    const [borrador, setBorrador] = useState<BorradorDia[]>(() =>
        horariosPorDia.map((h, i) => ({
            dia_semana: i,
            hora_entrada: h?.hora_entrada?.slice(0, 5) || '',
            hora_salida: h?.hora_salida?.slice(0, 5) || '',
        }))
    )

    async function guardar() {
        // Solo guardamos los días que tienen entrada Y salida
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
            onActualizado() // avisa a App para que recargue los horarios
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
            <div style={{ background: '#f4f4f5', borderRadius: 16, padding: 20, marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Horario base</h3>
                    <button onClick={() => setEditando(true)}>Editar</button>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
                    {DIAS.map((nombre, i) => {
                        const h = horariosPorDia[i]
                        return (
                            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                                <span>{nombre}</span>
                                <span>{h ? `${h.hora_entrada.slice(0, 5)} – ${h.hora_salida.slice(0, 5)}` : 'Libre'}</span>
                            </li>
                        )
                    })}
                </ul>
            </div>
        )
    }

    // ---------- Modo edición ----------
    return (
        <div style={{ background: '#f4f4f5', borderRadius: 16, padding: 20, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Editar horario base</h3>
            {DIAS.map((nombre, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <span>{nombre}</span>
                    <input
                        type="time"
                        value={borrador[i].hora_entrada}
                        onChange={(e) => cambiarHora(i, 'hora_entrada', e.target.value)}
                    />
                    <input
                        type="time"
                        value={borrador[i].hora_salida}
                        onChange={(e) => cambiarHora(i, 'hora_salida', e.target.value)}
                    />
                </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button onClick={guardar} style={{ flex: 1 }}>Guardar</button>
                <button onClick={() => setEditando(false)} style={{ flex: 1 }}>Cancelar</button>
            </div>
        </div>
    )
}