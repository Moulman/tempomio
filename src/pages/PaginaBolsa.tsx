import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fechaLarga, fechaLocal, formatDuracion, formatMinutos, minutosTrabajados } from '../lib/schedule'
import type { HorarioDia } from '../lib/schedule'
import { leerHoras } from '../lib/bolsa'
import type { Bolsa, Movimiento, ResumenBolsa } from '../lib/bolsa'
import CampoHoras from '../components/CampoHoras'

interface Props {
    bolsa: Bolsa
    resumen: ResumenBolsa
    horariosPorDia: (HorarioDia | null)[]
}

type Panel = 'usar' | 'mensaje' | 'ajuste' | 'inicial' | null

const color = (mins: number) => mins > 0 ? 'text-positivo' : mins < 0 ? 'text-negativo' : ''
// "Jue, 22 oct": solo la primera letra en mayúscula
function fechaCorta(fecha: string): string {
    const texto = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function etiqueta(m: Movimiento): string {
    if (m.tipo === 'inicial') return 'Saldo inicial'
    if (m.tipo === 'ajuste') return 'Ajuste'
    if (m.tipo === 'uso') return m.previsto ? 'Bolsa usada (previsto)' : 'Bolsa usada'
    return m.minutos > 0 ? 'Horas extra' : 'Por debajo de tu horario'
}

const claseBoton = 'flex-1 py-2.5 rounded-xl text-sm font-semibold'

// Bolsa de horas: saldo, usar horas, mensaje para la jefa, ajustes y movimientos
export default function PaginaBolsa({ bolsa, resumen, horariosPorDia }: Props) {
    const [params, setParams] = useSearchParams()
    const [panel, setPanel] = useState<Panel>(params.get('inicial') ? 'inicial' : null)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Formulario compartido (cada panel usa lo que necesita)
    const hoy = fechaLocal(new Date())
    const [fecha, setFecha] = useState(hoy)
    const [horas, setHoras] = useState('')
    const [minutos, setMinutos] = useState('')
    const [negativo, setNegativo] = useState(false)
    const [texto, setTexto] = useState('')
    const [mensaje, setMensaje] = useState('')
    const [copiado, setCopiado] = useState(false)

    function abrir(nuevo: Panel) {
        setError(null)
        setCopiado(false)
        setHoras('')
        setMinutos('')
        setNegativo(false)
        setTexto('')
        if (nuevo === 'inicial') {
            const ini = resumen.inicial
            setFecha(ini?.fecha ?? bolsa.fichajes[0]?.fecha ?? hoy)
            if (ini && ini.minutos !== 0) {
                setHoras(String(Math.floor(Math.abs(ini.minutos) / 60)))
                setMinutos(String(Math.abs(ini.minutos) % 60))
                setNegativo(ini.minutos < 0)
            }
        } else {
            setFecha(hoy)
        }
        if (nuevo === 'mensaje') setMensaje(textoMensaje(null, null))
        setPanel(nuevo)
        if (params.get('inicial')) setParams({}, { replace: true })
    }

    // Usa el saldo de este render: justo después de apuntar un uso aún es el
    // de antes de usarlo, que es el que se le cuenta a la jefa
    function textoMensaje(minutosUso: number | null, fechaUso: string | null): string {
        const base = `Hola, tengo ${formatDuracion(resumen.disponible)} acumuladas en mi bolsa de horas.`
        if (minutosUso === null || !fechaUso) return `${base} Me gustaría usar __ el día __.`
        return `${base} Me gustaría usar ${formatDuracion(minutosUso)} el ${fechaLarga(new Date(fechaUso + 'T00:00:00')).toLowerCase()}.`
    }

    // Duración del horario base de una fecha (para "todo el día")
    function horarioDe(f: string): number {
        const h = horariosPorDia[new Date(f + 'T00:00:00').getDay()]
        return h?.activo ? minutosTrabajados(h.hora_entrada, h.hora_salida) : 0
    }

    async function ejecutar(accion: () => Promise<boolean>, despues?: () => void) {
        setGuardando(true)
        setError(null)
        const ok = await accion()
        setGuardando(false)
        if (!ok) {
            setError('No se pudo guardar. Inténtalo otra vez.')
            return
        }
        if (despues) despues()
        else setPanel(null)
    }

    function guardarUso() {
        const m = leerHoras(horas, minutos)
        if (!m) return setError('Indica cuántas horas quieres usar.')
        const yaUsado = bolsa.fichajes.find((f) => f.fecha === fecha)?.bolsa_minutos ?? 0
        ejecutar(() => bolsa.usarBolsa(fecha, yaUsado + m, texto.trim() || null), () => {
            // Tras apuntarlo, se prepara el mensaje para la jefa con estos datos
            setMensaje(textoMensaje(m, fecha))
            setPanel('mensaje')
        })
    }

    function guardarAjuste() {
        const m = leerHoras(horas, minutos)
        if (!m) return setError('Indica las horas del ajuste.')
        ejecutar(() => bolsa.anadirAjuste(negativo ? -m : m, texto.trim() || null, hoy))
    }

    function guardarInicial() {
        const m = leerHoras(horas, minutos)
        if (m === null) return setError('Revisa las horas: horas enteras y minutos entre 0 y 59.')
        ejecutar(() => bolsa.guardarInicial(negativo ? -m : m, fecha))
    }

    async function compartir() {
        try {
            if (navigator.share) {
                await navigator.share({ text: mensaje })
            } else {
                await navigator.clipboard.writeText(mensaje)
                setCopiado(true)
            }
        } catch {
            // Compartir cancelado por la persona: no es un error
        }
    }

    async function copiar() {
        try {
            await navigator.clipboard.writeText(mensaje)
            setCopiado(true)
        } catch {
            setError('No se pudo copiar. Selecciona el texto y cópialo a mano.')
        }
    }

    async function borrar(m: Movimiento) {
        if (!m.ajusteId || !confirm(`¿Borrar el ajuste de ${formatMinutos(m.minutos)}?`)) return
        await ejecutar(() => bolsa.borrarAjuste(m.ajusteId!), () => {})
    }

    if (bolsa.error) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-10">
                <h1 className="text-2xl font-semibold mb-4">Bolsa de horas</h1>
                <p className="bg-superficie border border-linea rounded-xl p-5 text-tinta-suave">
                    La bolsa de horas aún no está activada en la base de datos.
                </p>
            </div>
        )
    }

    const minutosForm = leerHoras(horas, minutos) ?? 0

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-10">
            <h1 className="text-2xl font-semibold mb-4">Bolsa de horas</h1>

            {/* ---------- Saldo ---------- */}
            <section className={`bg-superficie border border-linea rounded-2xl p-5 ${bolsa.cargado ? '' : 'opacity-50'}`}>
                <p className="text-sm text-tinta-suave">Disponible</p>
                <p className={`mt-1 text-5xl font-semibold tabular-nums tracking-tight ${color(resumen.disponible)}`}>
                    {formatMinutos(resumen.disponible)}
                </p>
                {resumen.disponible < 0 && (
                    <p className="mt-1 text-sm text-negativo">Debes {formatDuracion(resumen.disponible)} a tu bolsa.</p>
                )}
                <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {[
                        { t: 'Horas extra', v: resumen.ganado },
                        { t: 'Por debajo', v: resumen.debido },
                        { t: 'Usado', v: -resumen.usado },
                        { t: 'Inicial y ajustes', v: resumen.ajustado },
                    ].map((d) => (
                        <div key={d.t} className="bg-fondo rounded-lg px-3 py-2">
                            <dt className="text-xs text-tinta-suave">{d.t}</dt>
                            <dd className={`font-semibold tabular-nums ${color(d.v)}`}>{formatMinutos(d.v)}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-3 text-xs text-tinta-tenue">
                    {resumen.inicial
                        ? `Contando desde el ${new Date(resumen.inicial.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}, con ${formatMinutos(resumen.inicial.minutos)} de saldo inicial. `
                        : 'Contando desde tu primer fichaje. '}
                    <button onClick={() => abrir('inicial')} className="text-acento hover:opacity-80">Cambiar saldo inicial</button>
                </p>
            </section>

            {/* ---------- Acciones ---------- */}
            <div className="mt-4 grid grid-cols-3 gap-2">
                <button onClick={() => abrir('usar')} className="py-3 rounded-xl bg-acento text-sobre-acento text-sm font-semibold">
                    Usar horas
                </button>
                <button onClick={() => abrir('mensaje')} className="py-3 rounded-xl bg-superficie border border-linea text-sm font-medium">
                    Mensaje a jefa
                </button>
                <button onClick={() => abrir('ajuste')} className="py-3 rounded-xl bg-superficie border border-linea text-sm font-medium">
                    Corregir saldo
                </button>
            </div>

            {/* ---------- Paneles ---------- */}
            {panel && (
                <section className="mt-4 bg-superficie border border-linea rounded-2xl p-5 space-y-4">
                    {panel === 'usar' && (
                        <>
                            <div>
                                <h2 className="font-medium">Usar horas de la bolsa</h2>
                                <p className="text-sm text-tinta-suave">Para salir antes o cogerte el día. Se descuenta ya, aunque sea para otro día.</p>
                            </div>
                            <label className="block text-xs text-tinta-suave">
                                Día
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="block w-full mt-1 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                                />
                            </label>
                            <div className="text-xs text-tinta-suave">
                                Horas
                                <div className="mt-1">
                                    <CampoHoras horas={horas} minutos={minutos} onHoras={setHoras} onMinutos={setMinutos} />
                                </div>
                                {horarioDe(fecha) > 0 && (
                                    <button
                                        onClick={() => {
                                            setHoras(String(Math.floor(horarioDe(fecha) / 60)))
                                            setMinutos(String(horarioDe(fecha) % 60))
                                        }}
                                        className="mt-2 px-3 py-1.5 rounded-full border border-linea text-xs text-tinta"
                                    >
                                        Todo el día ({formatDuracion(horarioDe(fecha))})
                                    </button>
                                )}
                            </div>
                            <label className="block text-xs text-tinta-suave">
                                Motivo (opcional)
                                <input
                                    type="text"
                                    value={texto}
                                    onChange={(e) => setTexto(e.target.value)}
                                    placeholder="Médico, recado…"
                                    className="w-full mt-1 bg-fondo border border-linea rounded-lg px-3 py-2 text-base text-tinta"
                                />
                            </label>
                            {minutosForm > 0 && (
                                <p className="text-sm">
                                    Te quedarán{' '}
                                    <span className={`font-semibold ${color(resumen.disponible - minutosForm)}`}>
                                        {formatMinutos(resumen.disponible - minutosForm)}
                                    </span>
                                </p>
                            )}
                            <div className="flex gap-2.5">
                                <button onClick={guardarUso} disabled={guardando} className={`${claseBoton} bg-acento text-sobre-acento disabled:opacity-60`}>
                                    {guardando ? 'Guardando...' : 'Apuntar'}
                                </button>
                                <button onClick={() => setPanel(null)} className={`${claseBoton} border border-linea font-medium`}>
                                    Cancelar
                                </button>
                            </div>
                        </>
                    )}

                    {panel === 'mensaje' && (
                        <>
                            <div>
                                <h2 className="font-medium">Mensaje para tu jefa</h2>
                                <p className="text-sm text-tinta-suave">Revísalo y envíalo por WhatsApp o donde quieras.</p>
                            </div>
                            <textarea
                                value={mensaje}
                                onChange={(e) => { setMensaje(e.target.value); setCopiado(false) }}
                                rows={4}
                                className="w-full bg-fondo border border-linea rounded-lg px-3 py-2 text-base text-tinta"
                            />
                            <div className="flex gap-2.5">
                                <button onClick={compartir} className={`${claseBoton} bg-acento text-sobre-acento`}>
                                    Compartir
                                </button>
                                <button onClick={copiar} className={`${claseBoton} border border-linea font-medium`}>
                                    {copiado ? 'Copiado ✓' : 'Copiar'}
                                </button>
                            </div>
                            <button onClick={() => setPanel(null)} className="w-full text-sm text-tinta-suave">Cerrar</button>
                        </>
                    )}

                    {panel === 'ajuste' && (
                        <>
                            <div>
                                <h2 className="font-medium">Corregir saldo</h2>
                                <p className="text-sm text-tinta-suave">Por ejemplo, para cuadrar con las cuentas de tu jefa. Queda apuntado con su motivo.</p>
                            </div>
                            <CampoHoras
                                horas={horas}
                                minutos={minutos}
                                onHoras={setHoras}
                                onMinutos={setMinutos}
                                negativo={negativo}
                                onNegativo={setNegativo}
                                etiquetas={['Sumar', 'Restar']}
                            />
                            <label className="block text-xs text-tinta-suave">
                                Motivo
                                <input
                                    type="text"
                                    value={texto}
                                    onChange={(e) => setTexto(e.target.value)}
                                    placeholder="Cuadre con mi jefa"
                                    maxLength={200}
                                    className="w-full mt-1 bg-fondo border border-linea rounded-lg px-3 py-2 text-base text-tinta"
                                />
                            </label>
                            <div className="flex gap-2.5">
                                <button onClick={guardarAjuste} disabled={guardando} className={`${claseBoton} bg-acento text-sobre-acento disabled:opacity-60`}>
                                    {guardando ? 'Guardando...' : 'Guardar ajuste'}
                                </button>
                                <button onClick={() => setPanel(null)} className={`${claseBoton} border border-linea font-medium`}>
                                    Cancelar
                                </button>
                            </div>
                        </>
                    )}

                    {panel === 'inicial' && (
                        <>
                            <div>
                                <h2 className="font-medium">Saldo inicial</h2>
                                <p className="text-sm text-tinta-suave">
                                    Las horas que ya tenías acumuladas y desde qué día empieza a contar la app.
                                    Los fichajes anteriores a ese día no se suman (ya están en tu saldo).
                                </p>
                            </div>
                            <CampoHoras
                                horas={horas}
                                minutos={minutos}
                                onHoras={setHoras}
                                onMinutos={setMinutos}
                                negativo={negativo}
                                onNegativo={setNegativo}
                                etiquetas={['Tengo a favor', 'Debo']}
                            />
                            <label className="block text-xs text-tinta-suave">
                                Empezar a contar desde
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="block w-full mt-1 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                                />
                            </label>
                            <div className="flex gap-2.5">
                                <button onClick={guardarInicial} disabled={guardando} className={`${claseBoton} bg-acento text-sobre-acento disabled:opacity-60`}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button onClick={() => setPanel(null)} className={`${claseBoton} border border-linea font-medium`}>
                                    Cancelar
                                </button>
                            </div>
                        </>
                    )}

                    {error && <p className="text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2">{error}</p>}
                </section>
            )}

            {/* ---------- Movimientos ---------- */}
            <h2 className="mt-8 mb-2 text-base font-medium">Movimientos</h2>
            {resumen.movimientos.length === 0 ? (
                <p className="bg-superficie border border-linea rounded-xl p-5 text-sm text-tinta-suave">
                    Aún no hay movimientos. Las horas extra de cada día aparecerán aquí.
                </p>
            ) : (
                <ul className="bg-superficie border border-linea rounded-xl divide-y divide-linea">
                    {resumen.movimientos.map((m) => (
                        <li key={m.clave} className={`flex items-center gap-3 px-4 py-3 ${m.previsto ? 'bg-acento/5' : ''}`}>
                            <span className="w-24 shrink-0 text-xs text-tinta-tenue">{fechaCorta(m.fecha)}</span>
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm">{etiqueta(m)}</span>
                                {m.nota && <span className="block text-xs text-tinta-suave truncate">{m.nota}</span>}
                            </span>
                            <span className={`text-sm font-semibold tabular-nums ${color(m.minutos)}`}>{formatMinutos(m.minutos)}</span>
                            {m.tipo === 'ajuste' && (
                                <button onClick={() => borrar(m)} aria-label="Borrar ajuste" className="px-1 text-tinta-tenue hover:text-negativo">
                                    ×
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
