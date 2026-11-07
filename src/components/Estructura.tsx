import { useEffect, useState } from 'react'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import type { Tema } from '../lib/tema'
import { formatReloj, minutosTrabajados, segundosDesde } from '../lib/schedule'
import type { HorarioDia } from '../lib/schedule'
import { useAhora } from '../lib/fichajeHoy'
import type { FichajeHoy } from '../lib/fichajeHoy'
import {
    IconoAdmin, IconoBolsa, IconoHecho, IconoHistorial, IconoHoy, IconoIdeas, IconoLuna, IconoPerfil, IconoSalir, IconoSemana, IconoSol, Marca,
} from './Iconos'
import AvisoDeshacer from './AvisoDeshacer'

interface Props {
    esAdmin: boolean
    tema: Tema
    onAlternarTema: () => void
    fichajeHoy: FichajeHoy
    horariosPorDia: (HorarioDia | null)[]
    children: ReactNode
}

interface Seccion {
    ruta: string
    titulo: string
    Icono: ComponentType<SVGProps<SVGSVGElement>>
}

// Barra inferior del móvil: dos pestañas a cada lado y Hoy en el centro.
// Ideas y Admin no caben (máximo 5): en el móvil se abren desde Perfil.
const MOVIL_IZQUIERDA: Seccion[] = [
    { ruta: '/semana', titulo: 'Semana', Icono: IconoSemana },
    { ruta: '/historial', titulo: 'Historial', Icono: IconoHistorial },
]
const MOVIL_DERECHA: Seccion[] = [
    { ruta: '/bolsa', titulo: 'Bolsa', Icono: IconoBolsa },
    { ruta: '/perfil', titulo: 'Perfil', Icono: IconoPerfil },
]
const RUTAS_DE_PERFIL = ['/perfil', '/ideas', '/admin']
const esDePerfil = (ruta: string) => RUTAS_DE_PERFIL.some((r) => ruta === r || ruta.startsWith(`${r}/`))

// Barra lateral en escritorio (md+) y barra inferior en móvil, con las mismas secciones
export default function Estructura({ esAdmin, tema, onAlternarTema, fichajeHoy, horariosPorDia, children }: Props) {
    const { fichaje, enCurso, marcarSalida } = fichajeHoy
    const ahora = useAhora(enCurso)
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const [saliendo, setSaliendo] = useState(false)

    // Mientras hay turno abierto, el tiempo se ve en la navegación y en el título de la pestaña
    const reloj = enCurso && fichaje?.hora_entrada ? formatReloj(segundosDesde(fichaje.hora_entrada, ahora)) : null

    useEffect(() => {
        document.title = reloj ? `${reloj} · TempoMio` : 'TempoMio'
    }, [reloj])

    async function salirDesdeBarra() {
        // Antes de tu hora: a Hoy, donde se pregunta si cubrirlo con la bolsa
        const h = horariosPorDia[new Date().getDay()]
        const previsto = h?.activo ? minutosTrabajados(h.hora_entrada, h.hora_salida) : 0
        const trabajado = fichaje?.hora_entrada ? Math.floor(segundosDesde(fichaje.hora_entrada, new Date()) / 60) : 0
        if (previsto - trabajado - (fichaje?.bolsa_minutos ?? 0) > 0) {
            navigate('/')
            return
        }
        setSaliendo(true)
        await marcarSalida()
        setSaliendo(false)
    }

    const secciones: Seccion[] = [
        { ruta: '/', titulo: 'Hoy', Icono: IconoHoy },
        { ruta: '/semana', titulo: 'Semana', Icono: IconoSemana },
        { ruta: '/historial', titulo: 'Historial', Icono: IconoHistorial },
        { ruta: '/bolsa', titulo: 'Bolsa de horas', Icono: IconoBolsa },
        { ruta: '/ideas', titulo: 'Ideas', Icono: IconoIdeas },
        { ruta: '/perfil', titulo: 'Perfil', Icono: IconoPerfil },
        ...(esAdmin ? [{ ruta: '/admin', titulo: 'Admin', Icono: IconoAdmin }] : []),
    ]
    const BotonTema = tema === 'claro' ? IconoLuna : IconoSol

    // Estado del día para el botón central del móvil
    const terminado = !!fichaje?.hora_entrada && !!fichaje?.hora_salida
    const enHoy = pathname === '/'
    const estadoHoy = reloj ? `en turno ${reloj}` : terminado ? 'jornada terminada' : 'sin fichar'

    function pestanaMovil({ ruta, titulo, Icono }: Seccion) {
        const activa = ruta === '/perfil' ? esDePerfil(pathname) : pathname === ruta
        return (
            <Link
                key={ruta}
                to={ruta}
                aria-current={activa ? 'page' : undefined}
                className={`flex flex-col items-center justify-end gap-1 min-h-13 text-[11px] font-semibold ${activa ? 'text-acento' : 'text-tinta-suave'}`}
            >
                <span className={`flex items-center justify-center w-13 h-7 rounded-full ${activa ? 'bg-acento/10' : ''}`}>
                    <Icono />
                </span>
                {titulo}
            </Link>
        )
    }

    return (
        <div className="min-h-screen bg-fondo text-tinta">
            {/* ---------- Barra lateral (escritorio) ---------- */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-superficie border-r border-linea px-3 py-5">
                <div className="flex items-center gap-2.5 px-3 mb-8">
                    <Marca />
                    <span className="text-lg font-semibold tracking-tight">TempoMio</span>
                </div>

                <nav aria-label="Menú" className="flex flex-col gap-1">
                    {secciones.map(({ ruta, titulo, Icono }) => (
                        <NavLink
                            key={ruta}
                            to={ruta}
                            end={ruta === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] transition-colors ${isActive
                                    ? 'bg-acento/10 text-acento font-semibold'
                                    : 'text-tinta-suave hover:bg-realce hover:text-tinta'}`}
                        >
                            <Icono />
                            {ruta === '/' && reloj ? <span className="tabular-nums">{reloj}</span> : titulo}
                            {ruta === '/' && reloj && <span className="ml-auto w-2 h-2 rounded-full bg-acento animate-pulse" />}
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-auto flex flex-col gap-1 border-t border-linea pt-3">
                    <button
                        onClick={onAlternarTema}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-tinta-suave hover:bg-realce hover:text-tinta"
                    >
                        <BotonTema />
                        {tema === 'claro' ? 'Tema oscuro' : 'Tema claro'}
                    </button>
                    <button
                        onClick={() => supabase.auth.signOut({ scope: 'local' })}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-tinta-suave hover:bg-realce hover:text-tinta"
                    >
                        <IconoSalir />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* ---------- Contenido ---------- */}
            <main className="md:pl-60 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
                {/* Turno abierto y fuera de Hoy: barra fina con el tiempo y la salida a mano */}
                {reloj && pathname !== '/' && (
                    <div className="sticky top-0 z-10 bg-superficie/95 backdrop-blur border-b border-linea pt-[env(safe-area-inset-top)]">
                        <div className="max-w-3xl mx-auto px-4 md:px-8 py-2.5 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-acento animate-pulse" />
                            <span className="text-sm text-tinta-suave">En turno</span>
                            <span className="font-semibold tabular-nums">{reloj}</span>
                            <button
                                onClick={salirDesdeBarra}
                                disabled={saliendo}
                                className="ml-auto px-3.5 py-1.5 rounded-lg bg-tinta text-superficie text-sm font-semibold disabled:opacity-60"
                            >
                                Marcar salida
                            </button>
                        </div>
                    </div>
                )}
                {children}
            </main>

            <AvisoDeshacer fichajeHoy={fichajeHoy} />

            {/* ---------- Barra inferior (móvil) ---------- */}
            <nav
                aria-label="Navegación principal"
                className="md:hidden fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 items-end bg-superficie/95 backdrop-blur border-t border-linea px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
            >
                {MOVIL_IZQUIERDA.map(pestanaMovil)}

                {/* Hoy en el centro: muestra el estado del día y lleva a Hoy (no ficha, para no marcar sin querer) */}
                <Link
                    to="/"
                    aria-label={`Hoy, ${estadoHoy}`}
                    aria-current={enHoy ? 'page' : undefined}
                    className="flex flex-col items-center gap-1"
                >
                    <span
                        className={`-mt-[30px] grid place-items-center w-[60px] h-[60px] rounded-full shadow-[0_0_0_5px_var(--superficie),0_6px_16px_rgba(29,36,48,0.18)] transition-colors ${enHoy ? 'outline-2 outline-offset-[3px] outline-acento' : ''} ${enCurso
                            ? 'bg-tinta text-superficie'
                            : terminado ? 'bg-positivo/15 text-positivo' : 'bg-acento text-sobre-acento'}`}
                    >
                        {terminado ? <IconoHecho width={26} height={26} /> : <IconoHoy width={26} height={26} />}
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums ${enCurso ? 'text-tinta' : terminado ? 'text-positivo' : 'text-acento'}`}>
                        {reloj ?? 'Hoy'}
                    </span>
                </Link>

                {MOVIL_DERECHA.map(pestanaMovil)}
            </nav>
        </div>
    )
}
