import type { ComponentType, ReactNode, SVGProps } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import type { Tema } from '../lib/tema'
import {
    IconoAdmin, IconoHistorial, IconoHoy, IconoIdeas, IconoLuna, IconoPerfil, IconoSalir, IconoSol, Marca,
} from './Iconos'

interface Props {
    esAdmin: boolean
    tema: Tema
    onAlternarTema: () => void
    children: ReactNode
}

interface Seccion {
    ruta: string
    titulo: string
    Icono: ComponentType<SVGProps<SVGSVGElement>>
}

// Barra lateral en escritorio (md+) y barra inferior en móvil, con las mismas secciones
export default function Estructura({ esAdmin, tema, onAlternarTema, children }: Props) {
    const secciones: Seccion[] = [
        { ruta: '/', titulo: 'Hoy', Icono: IconoHoy },
        { ruta: '/historial', titulo: 'Historial', Icono: IconoHistorial },
        { ruta: '/ideas', titulo: 'Ideas', Icono: IconoIdeas },
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
                            {titulo}
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
                {children}
            </main>

            {/* ---------- Barra inferior (móvil) ---------- */}
            <nav className="md:hidden fixed inset-x-0 bottom-0 z-10 flex bg-superficie/95 backdrop-blur border-t border-linea pb-[env(safe-area-inset-bottom)]">
                {secciones.map(({ ruta, titulo, Icono }) => (
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
                        {titulo}
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}
