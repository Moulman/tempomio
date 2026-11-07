import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import type { Tema } from '../lib/tema'
import type { HorarioDia } from '../lib/schedule'
import HorarioBase from '../components/HorarioBase'
import { LONGITUD_MINIMA, problemaContrasena } from '../lib/contrasena'
import { IconoAdmin, IconoIdeas, IconoLuna, IconoSalir, IconoSol } from '../components/Iconos'

interface Props {
    session: Session
    nombre: string | null
    esAdmin: boolean
    tema: Tema
    onAlternarTema: () => void
    horariosPorDia: (HorarioDia | null)[]
    onHorariosActualizados: () => void
    onPerfilActualizado: () => void
}

export default function PaginaPerfil({
    session, nombre, esAdmin, tema, onAlternarTema, horariosPorDia, onHorariosActualizados, onPerfilActualizado,
}: Props) {
    const [valor, setValor] = useState(nombre || '')
    const [guardando, setGuardando] = useState(false)
    const [guardado, setGuardado] = useState(false)

    async function guardar() {
        setGuardando(true)
        setGuardado(false)
        const { error } = await supabase
            .from('perfiles')
            .upsert({ id: session.user.id, nombre: valor })
        setGuardando(false)
        if (!error) {
            setGuardado(true)
            onPerfilActualizado()
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-10">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Perfil</h1>
            </div>

            {/* ---------- Ideas: arriba y a la vista ---------- */}
            <div className="bg-superficie border border-linea rounded-xl p-5 mb-4">
                <div className="flex items-center gap-3">
                    <IconoIdeas className="text-acento" />
                    <h2 className="font-semibold">Ideas para TempoMio</h2>
                </div>
                <p className="mt-2 text-sm text-tinta-suave">
                    ¿Echas algo de menos o algo no va bien? Cuéntalo: leemos todas las ideas.
                </p>
                <Link
                    to="/ideas"
                    className="mt-4 block w-full py-2.5 rounded-xl bg-acento text-sobre-acento font-semibold text-center"
                >
                    Contar una idea
                </Link>
            </div>

            <div className="bg-superficie border border-linea rounded-xl p-5">
                <label className="block text-sm text-tinta-suave mb-2">Nombre</label>
                <input
                    type="text"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full bg-fondo border border-linea rounded-lg px-3 py-2 text-tinta mb-2"
                />
                <p className="text-xs text-tinta-tenue mb-4">Email: {session.user.email}</p>
                <button
                    onClick={guardar}
                    disabled={guardando}
                    className="w-full py-2.5 rounded-xl bg-acento text-sobre-acento font-semibold"
                >
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                {guardado && <p className="text-positivo text-sm text-center mt-2">Guardado ✓</p>}
            </div>

            <div className="mt-4">
                <HorarioBase userId={session.user.id} horariosPorDia={horariosPorDia} onActualizado={onHorariosActualizados} />
            </div>

            <CambiarContrasena />

            {/* ---------- Apariencia ---------- */}
            <div className="bg-superficie border border-linea rounded-xl p-5 mt-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="font-medium">Tema oscuro</p>
                        <p className="text-sm text-tinta-suave">Se guarda en este dispositivo</p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={tema === 'oscuro'}
                        aria-label="Tema oscuro"
                        onClick={onAlternarTema}
                        className={`relative shrink-0 w-14 h-8 rounded-full transition-colors ${tema === 'oscuro' ? 'bg-acento' : 'bg-realce'}`}
                    >
                        <span
                            className={`absolute top-1 left-1 grid place-items-center w-6 h-6 rounded-full bg-superficie text-tinta-suave shadow-sm transition-transform ${tema === 'oscuro' ? 'translate-x-6' : ''}`}
                        >
                            {tema === 'oscuro' ? <IconoLuna width={14} height={14} /> : <IconoSol width={14} height={14} />}
                        </span>
                    </button>
                </div>
            </div>

            {/* Admin no cabe en la barra inferior del móvil: se llega desde aquí */}
            {esAdmin && (
                <Link
                    to="/admin"
                    className="md:hidden mt-4 flex items-center gap-3 bg-superficie border border-linea rounded-xl p-5"
                >
                    <IconoAdmin className="text-acento" />
                    <span className="flex-1">
                        <span className="block font-medium">Admin</span>
                        <span className="block text-sm text-tinta-suave">Usuarias, lista de espera e ideas</span>
                    </span>
                    <span className="text-tinta-tenue">›</span>
                </Link>
            )}

            {/* En escritorio también está en la barra lateral */}
            <button
                onClick={() => supabase.auth.signOut({ scope: 'local' })}
                className="md:hidden w-full flex items-center justify-center gap-2 mt-4 py-3 rounded-xl border border-linea text-negativo"
            >
                <IconoSalir width={18} height={18} />
                Cerrar sesión
            </button>
        </div>
    )
}

// Cambiar la contraseña estando dentro (la sesión ya demuestra quién es)
function CambiarContrasena() {
    const [abierto, setAbierto] = useState(false)
    const [contrasena, setContrasena] = useState('')
    const [repetida, setRepetida] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [hecho, setHecho] = useState(false)

    async function guardar(e: React.FormEvent) {
        e.preventDefault()
        const problema = problemaContrasena(contrasena, repetida)
        if (problema) {
            setError(problema)
            return
        }
        setGuardando(true)
        setError(null)
        const { error } = await supabase.auth.updateUser({ password: contrasena })
        setGuardando(false)
        if (error) {
            setError(error.code === 'same_password'
                ? 'La contraseña nueva tiene que ser distinta de la actual.'
                : 'No se pudo cambiar la contraseña. Inténtalo otra vez.')
            return
        }
        setHecho(true)
        setAbierto(false)
        setContrasena('')
        setRepetida('')
    }

    const campo = 'mt-1 w-full bg-fondo border border-linea rounded-lg px-3 py-2 text-tinta'

    return (
        <div className="bg-superficie border border-linea rounded-xl p-5 mt-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="font-medium">Contraseña</p>
                    {hecho && <p role="status" className="text-sm text-positivo">Contraseña cambiada ✓</p>}
                </div>
                {!abierto && (
                    <button onClick={() => { setAbierto(true); setHecho(false) }} className="min-h-11 px-3 text-sm text-acento font-medium">
                        Cambiar contraseña
                    </button>
                )}
            </div>
            {abierto && (
                <form onSubmit={guardar} className="mt-3 space-y-3">
                    <label className="block text-sm text-tinta-suave">
                        Contraseña nueva
                        <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required autoComplete="new-password" className={campo} />
                    </label>
                    <label className="block text-sm text-tinta-suave">
                        Repite la contraseña nueva
                        <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)} required autoComplete="new-password" className={campo} />
                    </label>
                    <p className="text-xs text-tinta-suave">Al menos {LONGITUD_MINIMA} caracteres. Un PIN de {LONGITUD_MINIMA} cifras vale.</p>
                    {error && <p role="alert" className="text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2">{error}</p>}
                    <div className="flex gap-2.5">
                        <button type="submit" disabled={guardando} className="flex-1 py-2.5 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60">
                            {guardando ? 'Guardando...' : 'Guardar contraseña'}
                        </button>
                        <button type="button" onClick={() => { setAbierto(false); setError(null) }} className="flex-1 py-2.5 rounded-xl border border-linea">
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
