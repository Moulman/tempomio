import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import type { HorarioDia } from './lib/schedule'
import Login from './components/Login'
import PaginaPrincipal from './pages/PaginaPrincipal'
import PaginaPerfil from './pages/PaginaPerfil'
import PaginaHistorial from './pages/PaginaHistorial'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState<string | null>(null)
  const [horariosPorDia, setHorariosPorDia] = useState<(HorarioDia | null)[]>(Array(7).fill(null))

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCargando(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      cargarHorarios()
      cargarPerfil()
    }
  }, [session])

  async function cargarHorarios() {
    const { data } = await supabase.from('horarios_base').select('*')
    const porDia: (HorarioDia | null)[] = Array(7).fill(null)
    for (const h of data || []) {
      if (h.activo) porDia[h.dia_semana] = h
    }
    setHorariosPorDia(porDia)
  }

  async function cargarPerfil() {
    const { data } = await supabase.from('perfiles').select('nombre').maybeSingle()
    setNombre(data?.nombre ?? null)
  }

  if (cargando) return null
  if (!session) return <Login />

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Routes>
        <Route
          path="/"
          element={
            <PaginaPrincipal
              session={session}
              nombre={nombre}
              horariosPorDia={horariosPorDia}
              onHorariosActualizados={cargarHorarios}
            />
          }
        />
        <Route
          path="/perfil"
          element={
            <PaginaPerfil
              session={session}
              nombre={nombre}
              onPerfilActualizado={cargarPerfil}
            />
          }
        />
        <Route
          path="/historial"
          element={
            <PaginaHistorial
              session={session}
              horariosPorDia={horariosPorDia}
            />
          }
        />
      </Routes>
    </div>
  )
}

export default App