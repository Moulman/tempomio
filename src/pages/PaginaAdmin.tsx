import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { lunesDeSemana } from '../lib/schedule'
import { PRIORIDADES, etiquetaPrioridad } from '../lib/sugerencias'
import type { Prioridad } from '../lib/sugerencias'

interface Usuario {
    id: string
    nombre: string | null
    created_at: string
    es_admin: boolean | null
    // Solo la fecha del último día fichado: la hora de cada persona no hace falta
    ultimoUso: string | null
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

// Aprobar pasa por la Edge Function «invitar»; aquí solo queda rechazar
type EstadoSolicitud = 'rechazada'

const fechaCorta = (fecha: string) =>
    new Date(fecha.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

// Sin estado (filas antiguas) o 'pendiente' cuentan como pendientes
const esPendiente = (s: Solicitud) => !s.estado || s.estado === 'pendiente'

// Los errores primero; dentro de cada grupo, lo más reciente arriba (ya viene ordenado)
const ORDEN_PRIORIDAD: Record<string, number> = { bug: 0, lo_necesito: 1, estaria_guay: 2 }

const COLOR_PRIORIDAD: Record<string, string> = {
    lo_necesito: 'bg-aviso/15 text-aviso',
    estaria_guay: 'bg-acento/15 text-acento',
    bug: 'bg-negativo/15 text-negativo',
}

// Zona de administración (/admin/*), cargada solo para la admin (React.lazy en App).
// El acceso real a los datos lo controla RLS (función es_admin()); App solo
// enruta aquí si perfiles.es_admin = true.
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
    const [avisoOk, setAvisoOk] = useState<string | null>(null)

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

            if (cancelado) return
            const perfiles = perfilesRes.data || []
            const fallo = perfilesRes.error || solicitudesRes.error || semanaRes.error || sugerenciasRes.error
            setError(fallo ? `No se pudieron cargar todos los datos: ${fallo.message}` : null)
            setUsuarios(perfiles.map((p) => ({ ...p, ultimoUso: null })))
            setSolicitudes(solicitudesRes.data || [])
            setSugerencias(sugerenciasRes.data || [])
            setFichajesSemana(semanaRes.count ?? null)
            // El panel se enseña ya; el «último uso» llega después (una consulta
            // por usuaria: con muchas cuentas tardaría y bloquearía todo el panel)
            setCargado(true)

            const ultimos = await Promise.all(
                perfiles.map((p) =>
                    supabase
                        .from('fichajes')
                        .select('fecha')
                        .eq('user_id', p.id)
                        .not('hora_entrada', 'is', null)
                        .order('fecha', { ascending: false })
                        .limit(1)
                        .maybeSingle()
                )
            )
            if (cancelado) return
            setUsuarios(perfiles.map((p, i) => ({ ...p, ultimoUso: ultimos[i].data?.fecha ?? null })))
        }

        cargar()
        return () => { cancelado = true }
    }, [recarga])

    // Aprobar = invitar: la Edge Function «invitar» comprueba que eres admin,
    // envía el email de invitación y marca la solicitud como aprobada
    async function aprobar(s: Solicitud) {
        setProcesando(s.id)
        setError(null)
        setAvisoOk(null)
        const { error } = await supabase.functions.invoke('invitar', {
            body: { solicitud_id: s.id, volver_a: window.location.origin },
        })
        setProcesando(null)
        if (error) {
            // El mensaje concreto viene en la respuesta de la función
            const detalle = await (error as { context?: Response }).context?.json?.().catch(() => null)
            setError(detalle?.error ?? 'No se pudo enviar la invitación. Inténtalo otra vez.')
            return
        }
        setAvisoOk(`Invitación enviada a ${s.email} ✓`)
        setRecarga((n) => n + 1)
    }

    async function cambiarEstado(s: Solicitud, estado: EstadoSolicitud) {
        if (!confirm(`¿Rechazar la solicitud de ${s.email}?`)) return
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
    const sugerenciasVisibles = (filtroPrioridad
        ? sugerencias.filter((s) => s.prioridad === filtroPrioridad)
        : [...sugerencias]
    ).sort((a, b) => (ORDEN_PRIORIDAD[a.prioridad] ?? 9) - (ORDEN_PRIORIDAD[b.prioridad] ?? 9))
    const errores = sugerencias.filter((s) => s.prioridad === 'bug').length

    const resumen = (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { titulo: 'Usuarias', valor: usuarios.length },
                    { titulo: 'Fichajes esta semana', valor: fichajesSemana ?? '—' },
                    { titulo: 'Solicitudes pendientes', valor: pendientes.length },
                    { titulo: 'Ideas recibidas', valor: sugerencias.length },
                ].map((s) => (
                    <div key={s.titulo} className="bg-superficie border border-linea rounded-xl p-4">
                        <p className="text-2xl font-semibold tabular-nums">{s.valor}</p>
                        <p className="text-xs text-tinta-suave mt-1">{s.titulo}</p>
                    </div>
                ))}
            </div>

            <section className="bg-superficie border border-linea rounded-xl p-5">
                <h2 className="text-base font-medium mb-3">Pendiente de ti</h2>
                {pendientes.length === 0 && errores === 0 ? (
                    <p className="text-sm text-tinta-tenue">Todo al día ✓</p>
                ) : (
                    <ul className="space-y-2">
                        {pendientes.length > 0 && (
                            <AvisoPendiente a="/admin/lista-de-espera">
                                {pendientes.length === 1 ? '1 solicitud de acceso' : `${pendientes.length} solicitudes de acceso`}
                            </AvisoPendiente>
                        )}
                        {errores > 0 && (
                            <AvisoPendiente a="/admin/ideas">
                                {errores === 1 ? '1 aviso de 🐛 Algo no va' : `${errores} avisos de 🐛 Algo no va`}
                            </AvisoPendiente>
                        )}
                    </ul>
                )}
            </section>
        </div>
    )

    const pestanas = [
        { ruta: '/admin', titulo: 'Resumen', cuenta: null },
        { ruta: '/admin/lista-de-espera', titulo: 'Lista de espera', cuenta: pendientes.length || null },
        { ruta: '/admin/ideas', titulo: 'Ideas', cuenta: sugerencias.length || null },
        { ruta: '/admin/usuarias', titulo: 'Usuarias', cuenta: null },
    ]

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Admin</h1>
            </div>

            {/* Secciones: en el móvil se desplazan en horizontal si no caben */}
            <nav aria-label="Secciones de admin" className="-mx-4 px-4 mb-4 flex gap-2 overflow-x-auto">
                {pestanas.map((p) => (
                    <NavLink
                        key={p.ruta}
                        to={p.ruta}
                        end
                        className={({ isActive }) =>
                            `shrink-0 inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-full border text-sm font-medium ${isActive
                                ? 'border-acento bg-acento/10 text-acento'
                                : 'border-linea text-tinta-suave hover:text-tinta'}`}
                    >
                        {p.titulo}
                        {p.cuenta !== null && (
                            <span className="min-w-5 px-1.5 rounded-full bg-realce text-tinta text-xs tabular-nums text-center">{p.cuenta}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {error && (
                <p role="alert" className="text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2 mb-4">{error}</p>
            )}
            {avisoOk && (
                <p role="status" className="text-sm text-positivo bg-positivo/10 rounded-lg px-3 py-2 mb-4">{avisoOk}</p>
            )}

            {!cargado ? (
                <p className="text-sm text-tinta-suave">Cargando...</p>
            ) : (
                <Routes>
                    <Route index element={resumen} />
                    <Route
                        path="lista-de-espera"
                        element={
                            <section className="bg-superficie border border-linea rounded-xl p-5">
                                <h2 className="text-base font-medium mb-3">Solicitudes pendientes</h2>
                                {pendientes.length === 0 ? (
                                    <p className="text-sm text-tinta-tenue">No hay solicitudes pendientes.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {pendientes.map((s) => (
                                            <li key={s.id} className="bg-fondo rounded-xl p-3">
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{s.nombre || 'Sin nombre'}</p>
                                                        <p className="text-sm text-tinta-suave truncate">{s.email}</p>
                                                        <p className="text-xs text-tinta-tenue mt-0.5">{fechaCorta(s.created_at)}</p>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <button
                                                            onClick={() => aprobar(s)}
                                                            disabled={procesando === s.id}
                                                            aria-label={`Aprobar e invitar a ${s.email}`}
                                                            className="px-3 py-1.5 rounded-lg bg-positivo text-sobre-acento text-sm font-semibold disabled:opacity-60"
                                                        >
                                                            {procesando === s.id ? 'Enviando...' : 'Aprobar'}
                                                        </button>
                                                        <button
                                                            onClick={() => cambiarEstado(s, 'rechazada')}
                                                            disabled={procesando === s.id}
                                                            className="px-3 py-1.5 rounded-lg border border-linea text-negativo text-sm disabled:opacity-60"
                                                        >
                                                            Rechazar
                                                        </button>
                                                    </div>
                                                </div>
                                                {s.mensaje && (
                                                    <p className="text-sm text-tinta mt-2 whitespace-pre-line">{s.mensaje}</p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {procesadas.length > 0 && (
                                    <div className="mt-4">
                                        <button
                                            onClick={() => setVerProcesadas(!verProcesadas)}
                                            className="text-sm text-acento hover:opacity-80"
                                        >
                                            {verProcesadas ? 'Ocultar' : 'Ver'} procesadas ({procesadas.length})
                                        </button>
                                        {verProcesadas && (
                                            <ul className="mt-2">
                                                {procesadas.map((s) => (
                                                    <li key={s.id} className="flex justify-between items-center gap-3 py-2 border-b border-linea last:border-0 text-sm">
                                                        <span className="truncate">{s.email}</span>
                                                        <span className="flex items-center gap-3 shrink-0">
                                                            {/* Si aún no la ha aceptado (o el enlace caducó), se puede enviar otra */}
                                                            {s.estado === 'aprobada' && (
                                                                <button
                                                                    onClick={() => aprobar(s)}
                                                                    disabled={procesando === s.id}
                                                                    aria-label={`Reenviar la invitación a ${s.email}`}
                                                                    className="min-h-11 px-2 text-acento font-medium disabled:opacity-60"
                                                                >
                                                                    {procesando === s.id ? 'Enviando...' : 'Reenviar'}
                                                                </button>
                                                            )}
                                                            <span className={s.estado === 'aprobada' ? 'text-positivo' : 'text-negativo'}>
                                                                {s.estado}
                                                            </span>
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </section>

                        }
                    />
                    <Route
                        path="ideas"
                        element={
                            <section className="bg-superficie border border-linea rounded-xl p-5">
                                <h2 className="text-base font-medium mb-3">Ideas recibidas ({sugerencias.length})</h2>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {[{ valor: null, etiqueta: 'Todas' }, ...PRIORIDADES.map((p) => ({ valor: p.valor, etiqueta: `${p.emoji} ${p.titulo}` }))].map((f) => (
                                        <button
                                            key={f.valor ?? 'todas'}
                                            onClick={() => setFiltroPrioridad(f.valor)}
                                            className={`px-2.5 py-1 rounded-full text-xs border ${filtroPrioridad === f.valor
                                                ? 'border-acento text-tinta'
                                                : 'border-linea text-tinta-suave'}`}
                                        >
                                            {f.etiqueta}
                                        </button>
                                    ))}
                                </div>
                                {sugerenciasVisibles.length === 0 ? (
                                    <p className="text-sm text-tinta-tenue">Aún no hay ideas aquí.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {sugerenciasVisibles.map((s) => (
                                            <li key={s.id} className="bg-fondo rounded-xl p-3">
                                                <div className="flex justify-between items-center gap-2 mb-1.5">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${COLOR_PRIORIDAD[s.prioridad] ?? 'bg-realce text-tinta'}`}>
                                                        {etiquetaPrioridad(s.prioridad)}
                                                    </span>
                                                    <span className="text-xs text-tinta-tenue truncate">
                                                        {nombrePorId[s.user_id] || 'Usuario'} · {fechaCorta(s.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-tinta whitespace-pre-line">{s.texto}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                        }
                    />
                    <Route
                        path="usuarias"
                        element={
                            <section className="bg-superficie border border-linea rounded-xl p-5">
                                <h2 className="text-base font-medium mb-3">Usuarias ({usuarios.length})</h2>
                                <ul>
                                    {usuarios.map((u) => (
                                        <li key={u.id} className="flex justify-between items-center gap-3 py-2.5 border-b border-linea last:border-0 text-sm">
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">
                                                    {u.nombre || 'Sin nombre'}
                                                    {u.es_admin && <span className="ml-2 text-xs text-aviso">admin</span>}
                                                </p>
                                                <p className="text-xs text-tinta-tenue">alta {fechaCorta(u.created_at)}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs text-tinta-tenue">Último uso</p>
                                                <p className="text-tinta">{u.ultimoUso ? fechaCorta(u.ultimoUso) : '—'}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        }
                    />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
            )}
        </div>
    )
}

// Enlace a algo que necesita la atención de la admin
function AvisoPendiente({ a, children }: { a: string; children: ReactNode }) {
    return (
        <li>
            <Link to={a} className="flex items-center justify-between gap-3 min-h-11 px-3 rounded-xl bg-fondo text-sm hover:bg-realce">
                <span>{children}</span>
                <span className="text-acento font-medium">Revisar →</span>
            </Link>
        </li>
    )
}
