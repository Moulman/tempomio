import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import type { HorarioDia } from './lib/schedule'
import Login from './components/Login'
import PaginaPrincipal from './pages/PaginaPrincipal'
import PaginaPerfil from './pages/PaginaPerfil'
import PaginaHistorial from './pages/PaginaHistorial'
import PaginaSemana from './pages/PaginaSemana'
import PaginaIdeas from './pages/PaginaIdeas'
// La zona de admin se descarga solo cuando la admin entra en ella
const PaginaAdmin = lazy(() => import('./pages/PaginaAdmin'))
import Estructura from './components/Estructura'
import { useTema } from './lib/tema'
import { useFichajeHoy } from './lib/fichajeHoy'
import { calcularBolsa, useBolsa } from './lib/bolsa'
import { fechaLocal } from './lib/schedule'
import PaginaBolsa from './pages/PaginaBolsa'
import Bienvenida from './components/Bienvenida'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [perfilCargado, setPerfilCargado] = useState(false)
  const [horariosPorDia, setHorariosPorDia] = useState<(HorarioDia | null)[]>(Array(7).fill(null))
  const { tema, alternarTema } = useTema()
  const fichajeHoy = useFichajeHoy(session?.user.id ?? null)
  // La bolsa se recarga cada vez que se guarda el fichaje de hoy
  const bolsa = useBolsa(session?.user.id ?? null, fichajeHoy.version)

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

  const resumenBolsa = calcularBolsa(bolsa.fichajes, bolsa.ajustes, horariosPorDia, fechaLocal(new Date()))

  // Cuenta nueva (sin fichajes ni saldo inicial): primero la bienvenida
  if (perfilCargado && bolsa.cargado && !bolsa.error && !resumenBolsa.inicial && bolsa.fichajes.length === 0) {
    return (
      <Bienvenida
        session={session}
        nombre={nombre}
        horariosPorDia={horariosPorDia}
        bolsa={bolsa}
        onPerfilActualizado={() => cargarPerfil(session.user.id)}
        onHorariosActualizados={() => cargarHorarios(session.user.id)}
      />
    )
  }

  // Un día editado desde Semana o Historial puede ser hoy y cambia la bolsa
  function diaGuardado() {
    fichajeHoy.recargar()
    bolsa.recargar()
  }

  return (
    <Estructura esAdmin={esAdmin} tema={tema} onAlternarTema={alternarTema} fichajeHoy={fichajeHoy} horariosPorDia={horariosPorDia}>
      <Routes>
        <Route
          path="/"
          element={
            <PaginaPrincipal
              session={session}
              nombre={nombre}
              horariosPorDia={horariosPorDia}
              fichajeHoy={fichajeHoy}
              bolsa={bolsa}
              resumenBolsa={resumenBolsa}
            />
          }
        />
        <Route
          path="/perfil"
          element={
            <PaginaPerfil
              session={session}
              nombre={nombre}
              esAdmin={esAdmin}
              tema={tema}
              onAlternarTema={alternarTema}
              horariosPorDia={horariosPorDia}
              onHorariosActualizados={() => cargarHorarios(session.user.id)}
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
              onDiaGuardado={diaGuardado}
            />
          }
        />
        <Route
          path="/semana"
          element={
            <PaginaSemana
              session={session}
              horariosPorDia={horariosPorDia}
              onDiaGuardado={diaGuardado}
            />
          }
        />
        <Route
          path="/bolsa"
          element={<PaginaBolsa bolsa={bolsa} resumen={resumenBolsa} horariosPorDia={horariosPorDia} />}
        />
        <Route path="/ideas" element={<PaginaIdeas session={session} />} />
        <Route
          path="/admin/*"
          element={!perfilCargado ? null : esAdmin ? (
            <Suspense fallback={<p className="max-w-3xl mx-auto px-4 py-6 md:px-8 text-sm text-tinta-suave">Cargando...</p>}>
              <PaginaAdmin />
            </Suspense>
          ) : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Estructura>
  )
}

export default App
