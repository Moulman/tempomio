import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { enlaceCaducado } from '../lib/enlaceEmail'
import { Marca } from './Iconos'

type Modo = 'login' | 'solicitud'

export default function Login() {
    const [modo, setModo] = useState<Modo>('login')

    // ---------- Inicio de sesión ----------
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    // Un enlace de email ya usado o caducado vuelve aquí con el error en la dirección
    const [error, setError] = useState<string | null>(() =>
        enlaceCaducado(window.location.hash)
            ? 'Ese enlace ya no sirve: ya se ha usado o ha caducado. Pide una invitación nueva.'
            : null)
    const [cargando, setCargando] = useState(false)

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setCargando(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) setError('Email o contraseña incorrectos.')
        setCargando(false)
    }

    // ---------- Solicitud de acceso ----------
    const [emailSolicitud, setEmailSolicitud] = useState('')
    const [trampa, setTrampa] = useState('') // honeypot: los bots suelen rellenar todos los campos
    const [enviandoSolicitud, setEnviandoSolicitud] = useState(false)
    const [errorSolicitud, setErrorSolicitud] = useState<string | null>(null)
    const [solicitudEnviada, setSolicitudEnviada] = useState(false)

    async function handleSolicitud(e: React.FormEvent) {
        e.preventDefault()

        if (trampa) {
            // Bot detectado: simulamos éxito sin escribir nada
            setSolicitudEnviada(true)
            return
        }

        setEnviandoSolicitud(true)
        setErrorSolicitud(null)

        const { error } = await supabase
            .from('solicitudes_acceso')
            .insert({ email: emailSolicitud })

        // Si el email ya estaba registrado, lo tratamos igualmente como éxito
        if (error && error.code !== '23505') {
            setErrorSolicitud('Algo ha ido mal. Inténtalo de nuevo en un momento.')
        } else {
            setSolicitudEnviada(true)
        }
        setEnviandoSolicitud(false)
    }

    function cambiarModo(nuevo: Modo) {
        setModo(nuevo)
        setError(null)
        setErrorSolicitud(null)
        setSolicitudEnviada(false)
    }

    return (
        <div className="min-h-screen bg-fondo flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm">
                <div className="text-center mb-6">
                    <Marca width={48} height={48} className="mx-auto mb-3" />
                    <h1 className="text-2xl font-semibold text-tinta">TempoMio</h1>
                    <p className="text-sm text-tinta-suave mt-1">
                        Controla tu jornada y tus horas extra
                    </p>
                </div>

                <div className="bg-superficie border border-linea rounded-xl p-6 shadow-sm ">
                    <div className="flex gap-1 mb-5 bg-fondo rounded-xl p-1">
                        <button
                            type="button"
                            onClick={() => cambiarModo('login')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${modo === 'login' ? 'bg-realce text-tinta' : 'text-tinta-suave'
                                }`}
                        >
                            Iniciar sesión
                        </button>
                        <button
                            type="button"
                            onClick={() => cambiarModo('solicitud')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${modo === 'solicitud' ? 'bg-realce text-tinta' : 'text-tinta-suave'
                                }`}
                        >
                            Solicitar acceso
                        </button>
                    </div>

                    {modo === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-3">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                className="w-full bg-fondo border border-linea rounded-lg px-3 py-2.5 text-tinta placeholder:text-tinta-tenue focus:outline-none focus:ring-2 focus:ring-acento"
                            />
                            <input
                                type="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                className="w-full bg-fondo border border-linea rounded-lg px-3 py-2.5 text-tinta placeholder:text-tinta-tenue focus:outline-none focus:ring-2 focus:ring-acento"
                            />
                            {error && (
                                <p className="text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2">{error}</p>
                            )}
                            <button
                                type="submit"
                                disabled={cargando}
                                className="w-full py-3 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60"
                            >
                                {cargando ? 'Entrando...' : 'Entrar'}
                            </button>
                        </form>
                    ) : solicitudEnviada ? (
                        <p className="text-sm text-positivo bg-positivo/10 rounded-lg px-3 py-3 text-center">
                            ¡Gracias! Te avisaremos en cuanto tengas acceso ✓
                        </p>
                    ) : (
                        <form onSubmit={handleSolicitud} className="space-y-3">
                            <p className="text-sm text-tinta-suave">
                                Déjanos tu email y te crearemos una cuenta.
                            </p>
                            <input
                                type="email"
                                placeholder="Tu email"
                                value={emailSolicitud}
                                onChange={(e) => setEmailSolicitud(e.target.value)}
                                required
                                autoComplete="email"
                                className="w-full bg-fondo border border-linea rounded-lg px-3 py-2.5 text-tinta placeholder:text-tinta-tenue focus:outline-none focus:ring-2 focus:ring-acento"
                            />
                            {/* Honeypot: invisible para personas, tentador para bots */}
                            <input
                                type="text"
                                value={trampa}
                                onChange={(e) => setTrampa(e.target.value)}
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                                className="absolute -left-[9999px] w-px h-px opacity-0"
                            />
                            {errorSolicitud && (
                                <p className="text-sm text-negativo bg-negativo/10 rounded-lg px-3 py-2">{errorSolicitud}</p>
                            )}
                            <button
                                type="submit"
                                disabled={enviandoSolicitud}
                                className="w-full py-3 rounded-xl bg-acento text-sobre-acento font-semibold disabled:opacity-60"
                            >
                                {enviandoSolicitud ? 'Enviando...' : 'Solicitar acceso'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
