import { useEffect, useState } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import type { HorarioDia } from './lib/schedule'
import Login from './components/Login'
import PaginaPrincipal from './pages/PaginaPrincipal'
import PaginaPerfil from './pages/PaginaPerfil'
import PaginaHistorial from './pages/PaginaHistorial'
import PaginaIdeas from './pages/PaginaIdeas'
import PaginaAdmin from './pages/PaginaAdmin'
import Estructura from './components/Estructura'
import { useTema } from './lib/tema'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [perfilCargado, setPerfilCargado] = useState(false)
  const [horariosPorDia, setHorariosPorDia] = useState<(HorarioDia | null)[]>(Array(7).fill(null))
  const { tema, alternarTema } = useTema()

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
      cargarHorarios(session.user.id)
      cargarPerfil(session.user.id)
    }
  }, [session])

  // Filtrado siempre por user_id: con las policies de admin, RLS devolvería filas de otros usuarios
  async function cargarHorarios(userId: string) {
    const { data } = await supabase.from('horarios_base').select('*').eq('user_id', userId)
    const porDia: (HorarioDia | null)[] = Array(7).fill(null)
    for (const h of data || []) {
      if (h.activo) porDia[h.dia_semana] = h
    }
    setHorariosPorDia(porDia)
  }

  async function cargarPerfil(userId: string) {
    const { data } = await supabase
      .from('perfiles')
      .select('nombre, es_admin')
      .eq('id', userId)
      .maybeSingle()
    setNombre(data?.nombre ?? null)
    setEsAdmin(data?.es_admin === true)
    setPerfilCargado(true)
  }

  if (cargando) return null
  if (!session) return <Login />

  return (
    <Estructura esAdmin={esAdmin} tema={tema} onAlternarTema={alternarTema}>
      <Routes>
        <Route
          path="/"
          element={
            <PaginaPrincipal
              session={session}
              nombre={nombre}
              horariosPorDia={horariosPorDia}
              onHorariosActualizados={() => cargarHorarios(session.user.id)}
            />
          }
        />
        <Route
          path="/perfil"
          element={
            <PaginaPerfil
              session={session}
              nombre={nombre}
              tema={tema}
              onAlternarTema={alternarTema}
              onPerfilActualizado={() => cargarPerfil(session.user.id)}
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
        <Route path="/ideas" element={<PaginaIdeas session={session} />} />
        <Route
          path="/admin"
          element={!perfilCargado ? null : esAdmin ? <PaginaAdmin /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Estructura>
  )
}

export default App
