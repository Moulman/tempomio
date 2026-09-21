import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [cargando, setCargando] = useState(false)

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setCargando(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) setError(error.message)
        setCargando(false)
    }

    return (
        <div style={{ maxWidth: 320, margin: '80px auto', padding: 24, textAlign: 'center' }}>
            <h1>TempoMio</h1>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}
                <button type="submit" disabled={cargando}>
                    {cargando ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
        </div>
    )
}