import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Login from './components/Login'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // Al arrancar, comprobamos si ya hay una sesión guardada
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCargando(false)
    })

    // Nos suscribimos a cambios de sesión (login / logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Limpiamos la suscripción al desmontar
    return () => listener.subscription.unsubscribe()
  }, [])

  if (cargando) return null

  if (!session) return <Login />

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>TempoMio</h1>
      <p>Sesión iniciada como {session.user.email}</p>
      <button onClick={() => supabase.auth.signOut()}>Salir</button>
    </div>
  )
}

export default App