import { useEffect, useState } from 'react'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import type { Tema } from '../lib/tema'
import { formatReloj, segundosDesde } from '../lib/schedule'
import { useAhora } from '../lib/fichajeHoy'
import type { FichajeHoy } from '../lib/fichajeHoy'
import {
    IconoAdmin, IconoHistorial, IconoHoy, IconoIdeas, IconoLuna, IconoPerfil, IconoSalir, IconoSemana, IconoSol, Marca,
} from './Iconos'

interface Props {
    esAdmin: boolean
    tema: Tema
    onAlternarTema: () => void
    fichajeHoy: FichajeHoy
    children: ReactNode
}

interface Seccion {
    ruta: string
    titulo: string
    Icono: ComponentType<SVGProps<SVGSVGElement>>
    // Fuera de la barra inferior del móvil (para no pasar de 5 iconos); en móvil se llega desde Perfil
    soloEscritorio?: boolean
}

// Barra lateral en escritorio (md+) y barra inferior en móvil, con las mismas secciones
export default function Estructura({ esAdmin, tema, onAlternarTema, fichajeHoy, children }: Props) {
    const { fichaje, enCurso, marcarSalida } = fichajeHoy
    const ahora = useAhora(enCurso)
    const { pathname } = useLocation()
    const [saliendo, setSaliendo] = useState(false)

    // Mientras hay turno abierto, el tiempo se ve en la navegación y en el título de la pestaña
    const reloj = enCurso && fichaje?.hora_entrada ? formatReloj(segundosDesde(fichaje.hora_entrada, ahora)) : null

    useEffect(() => {
        document.title = reloj ? `${reloj} · TempoMio` : 'TempoMio'
    }, [reloj])

    async function salirDesdeBarra() {
        setSaliendo(true)
        await marcarSalida()
        setSaliendo(false)
    }

    const secciones: Seccion[] = [
        { ruta: '/', titulo: 'Hoy', Icono: IconoHoy },
        { ruta: '/semana', titulo: 'Semana', Icono: IconoSemana },
        { ruta: '/historial', titulo: 'Historial', Icono: IconoHistorial },
        { ruta: '/ideas', titulo: 'Ideas', Icono: IconoIdeas, soloEscritorio: true },
        { ruta: '/perfil', titulo: 'Perfil', Icono: IconoPerfil },
        ...(esAdmin ? [{ ruta: '/admin', titulo: 'Admin', Icono: IconoAdmin }] : []),
    ]
    const BotonTema = tema === 'claro' ? IconoLuna : IconoSol

    return (
        <div className="min-h-screen bg-fondo text-tinta">
            {/* ---------- Barra lateral (escritorio) ---------- */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-superficie border-r border-linea px-3 py-5">
                <div className="flex items-center gap-2.5 px-3 mb-8">
                    <Marca />
                    <span className="text-lg font-semibold tracking-tight">TempoMio</span>
                </div>

                <nav className="flex flex-col gap-1">
                    {secciones.map(({ ruta, titulo, Icono }) => (
                        <NavLink
                            key={ruta}
                            to={ruta}
                            end
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
                        onClick={() => supabase.auth.signOut()}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-tinta-suave hover:bg-realce hover:text-tinta"
                    >
                        <IconoSalir />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* ---------- Contenido ---------- */}
            <main className="md:pl-60 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
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

            {/* ---------- Barra inferior (móvil) ---------- */}
            <nav className="md:hidden fixed inset-x-0 bottom-0 z-10 flex bg-superficie/95 backdrop-blur border-t border-linea pb-[env(safe-area-inset-bottom)]">
                {secciones.filter((s) => !s.soloEscritorio).map(({ ruta, titulo, Icono }) => (
                    <NavLink
                        key={ruta}
                        to={ruta}
                        end
                        className={({ isActive }) =>
                            `flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium ${isActive
                                ? 'text-acento'
                                : 'text-tinta-tenue'}`}
                    >
                        <Icono />
                        {ruta === '/' && reloj ? <span className="tabular-nums text-acento">{reloj}</span> : titulo}
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}
