import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { lunesDeSemana } from '../lib/schedule'
import { PRIORIDADES, etiquetaPrioridad } from '../lib/sugerencias'
import type { Prioridad } from '../lib/sugerencias'

interface Usuario {
    id: string
    nombre: string | null
    created_at: string
    es_admin: boolean | null
    ultimoFichaje: { fecha: string; hora_entrada: string | null } | null
}

interface Solicitud {
    id: string
    nombre: string | null
    email: string
    mensaje: string | null
    estado: string | null
    created_at: string
}

interface Sugerencia {
    id: string
    user_id: string
    prioridad: string
    texto: string
    created_at: string
}

type EstadoSolicitud = 'aprobada' | 'rechazada'

const fechaCorta = (fecha: string) =>
    new Date(fecha.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

// Sin estado (filas antiguas) o 'pendiente' cuentan como pendientes
const esPendiente = (s: Solicitud) => !s.estado || s.estado === 'pendiente'

const COLOR_PRIORIDAD: Record<string, string> = {
    lo_necesito: 'bg-orange-500/15 text-orange-300',
    estaria_guay: 'bg-sky-500/15 text-sky-300',
    bug: 'bg-red-500/15 text-red-300',
}

// Dashboard de administración. El acceso real a los datos lo controla RLS
// (función es_admin()); App solo enruta aquí si perfiles.es_admin = true.
export default function PaginaAdmin() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
    const [sugerencias, setSugerencias] = useState<Sugerencia[]>([])
    const [fichajesSemana, setFichajesSemana] = useState<number | null>(null)
    const [cargado, setCargado] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [recarga, setRecarga] = useState(0)
    const [procesando, setProcesando] = useState<string | null>(null)
    const [verProcesadas, setVerProcesadas] = useState(false)
    const [filtroPrioridad, setFiltroPrioridad] = useState<Prioridad | null>(null)

    useEffect(() => {
        let cancelado = false

        async function cargar() {
            const [perfilesRes, solicitudesRes, semanaRes, sugerenciasRes] = await Promise.all([
                supabase.from('perfiles').select('id, nombre, created_at, es_admin').order('created_at'),
                supabase
                    .from('solicitudes_acceso')
                    .select('id, nombre, email, mensaje, estado, created_at')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('fichajes')
                    .select('id', { count: 'exact', head: true })
                    .not('hora_entrada', 'is', null)
                    .gte('fecha', lunesDeSemana(new Date())),
                supabase
                    .from('sugerencias')
                    .select('id, user_id, prioridad, texto, created_at')
                    .order('created_at', { ascending: false }),
            ])

            // Último fichaje de cada usuario (pocas cuentas: una consulta por usuario)
            const perfiles = perfilesRes.data || []
            const ultimos = await Promise.all(
                perfiles.map((p) =>
                    supabase
                        .from('fichajes')
                        .select('fecha, hora_entrada')
                        .eq('user_id', p.id)
                        .not('hora_entrada', 'is', null)
                        .order('fecha', { ascending: false })
                        .limit(1)
                        .maybeSingle()
                )
            )
            if (cancelado) return

            const fallo = perfilesRes.error || solicitudesRes.error || semanaRes.error || sugerenciasRes.error
            setError(fallo ? `No se pudieron cargar todos los datos: ${fallo.message}` : null)
            setUsuarios(perfiles.map((p, i) => ({ ...p, ultimoFichaje: ultimos[i].data ?? null })))
            setSolicitudes(solicitudesRes.data || [])
            setSugerencias(sugerenciasRes.data || [])
            setFichajesSemana(semanaRes.count ?? null)
            setCargado(true)
        }

        cargar()
        return () => { cancelado = true }
    }, [recarga])

    async function cambiarEstado(s: Solicitud, estado: EstadoSolicitud) {
        if (estado === 'rechazada' && !confirm(`¿Rechazar la solicitud de ${s.email}?`)) return
        setProcesando(s.id)
        // select() para detectar si RLS ha bloqueado el update (0 filas sin error)
        const { data, error } = await supabase
            .from('solicitudes_acceso')
            .update({ estado })
            .eq('id', s.id)
            .select('id')
        setProcesando(null)
        if (error || !data?.length) {
            setError(`No se pudo actualizar la solicitud${error ? `: ${error.message}` : ' (¿falta la policy de update para admin?)'}`)
            return
        }
        setRecarga((n) => n + 1)
    }

    const pendientes = solicitudes.filter(esPendiente)
    const procesadas = solicitudes.filter((s) => !esPendiente(s))
    const nombrePorId = Object.fromEntries(usuarios.map((u) => [u.id, u.nombre]))
    const sugerenciasVisibles = filtroPrioridad
        ? sugerencias.filter((s) => s.prioridad === filtroPrioridad)
        : sugerencias

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Admin</h1>
            </div>

            {error && (
                <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 mb-4">{error}</p>
            )}

            {!cargado ? (
                <p className="text-sm text-slate-400">Cargando...</p>
            ) : (
                <>
                    {/* ---------- Stats ---------- */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                            { titulo: 'Usuarios', valor: usuarios.length },
                            { titulo: 'Fichajes esta semana', valor: fichajesSemana ?? '—' },
                            { titulo: 'Solicitudes pendientes', valor: pendientes.length },
                        ].map((s) => (
                            <div key={s.titulo} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                                <p className="text-2xl font-semibold">{s.valor}</p>
                                <p className="text-xs text-slate-400 mt-1">{s.titulo}</p>
                            </div>
                        ))}
                    </div>

                    {/* ---------- Solicitudes ---------- */}
                    <section className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
                        <h2 className="text-base font-medium mb-3">Solicitudes pendientes</h2>
                        {pendientes.length === 0 ? (
                            <p className="text-sm text-slate-500">No hay solicitudes pendientes.</p>
                        ) : (
                            <ul className="space-y-2">
                                {pendientes.map((s) => (
                                    <li key={s.id} className="bg-slate-900 rounded-xl p-3">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{s.nombre || 'Sin nombre'}</p>
                                                <p className="text-sm text-slate-400 truncate">{s.email}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{fechaCorta(s.created_at)}</p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => cambiarEstado(s, 'aprobada')}
                                                    disabled={procesando === s.id}
                                                    className="px-3 py-1.5 rounded-lg bg-green-500 text-slate-900 text-sm font-semibold disabled:opacity-60"
                                                >
                                                    Aprobar
                                                </button>
                                                <button
                                                    onClick={() => cambiarEstado(s, 'rechazada')}
                                                    disabled={procesando === s.id}
                                                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-red-400 text-sm disabled:opacity-60"
                                                >
                                                    Rechazar
                                                </button>
                                            </div>
                                        </div>
                                        {s.mensaje && (
                                            <p className="text-sm text-slate-300 mt-2 whitespace-pre-line">{s.mensaje}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {procesadas.length > 0 && (
                            <div className="mt-4">
                                <button
                                    onClick={() => setVerProcesadas(!verProcesadas)}
                                    className="text-sm text-sky-400 hover:text-sky-300"
                                >
                                    {verProcesadas ? 'Ocultar' : 'Ver'} procesadas ({procesadas.length})
                                </button>
                                {verProcesadas && (
                                    <ul className="mt-2">
                                        {procesadas.map((s) => (
                                            <li key={s.id} className="flex justify-between py-2 border-b border-slate-700 last:border-0 text-sm">
                                                <span className="truncate">{s.email}</span>
                                                <span className={s.estado === 'aprobada' ? 'text-green-400' : 'text-red-400'}>
                                                    {s.estado}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </section>

                    {/* ---------- Sugerencias ---------- */}
                    <section className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
                        <h2 className="text-base font-medium mb-3">Ideas recibidas ({sugerencias.length})</h2>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {[{ valor: null, etiqueta: 'Todas' }, ...PRIORIDADES.map((p) => ({ valor: p.valor, etiqueta: `${p.emoji} ${p.titulo}` }))].map((f) => (
                                <button
                                    key={f.valor ?? 'todas'}
                                    onClick={() => setFiltroPrioridad(f.valor)}
                                    className={`px-2.5 py-1 rounded-full text-xs border ${filtroPrioridad === f.valor
                                        ? 'border-sky-400 text-slate-100'
                                        : 'border-slate-700 text-slate-400'}`}
                                >
                                    {f.etiqueta}
                                </button>
                            ))}
                        </div>
                        {sugerenciasVisibles.length === 0 ? (
                            <p className="text-sm text-slate-500">Aún no hay ideas aquí.</p>
                        ) : (
                            <ul className="space-y-2">
                                {sugerenciasVisibles.map((s) => (
                                    <li key={s.id} className="bg-slate-900 rounded-xl p-3">
                                        <div className="flex justify-between items-center gap-2 mb-1.5">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${COLOR_PRIORIDAD[s.prioridad] ?? 'bg-slate-700 text-slate-300'}`}>
                                                {etiquetaPrioridad(s.prioridad)}
                                            </span>
                                            <span className="text-xs text-slate-500 truncate">
                                                {nombrePorId[s.user_id] || 'Usuario'} · {fechaCorta(s.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-200 whitespace-pre-line">{s.texto}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* ---------- Usuarios ---------- */}
                    <section className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                        <h2 className="text-base font-medium mb-3">Usuarios</h2>
                        <ul>
                            {usuarios.map((u) => (
                                <li key={u.id} className="flex justify-between items-center gap-3 py-2.5 border-b border-slate-700 last:border-0 text-sm">
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">
                                            {u.nombre || 'Sin nombre'}
                                            {u.es_admin && <span className="ml-2 text-xs text-amber-400">admin</span>}
                                        </p>
                                        <p className="text-xs text-slate-500">alta {fechaCorta(u.created_at)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-slate-500">Último fichaje</p>
                                        <p className="text-slate-200">
                                            {u.ultimoFichaje
                                                ? `${fechaCorta(u.ultimoFichaje.fecha)} ${u.ultimoFichaje.hora_entrada?.slice(0, 5) ?? ''}`
                                                : '—'}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                </>
            )}
        </div>
    )
}
