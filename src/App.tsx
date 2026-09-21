import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import type { HorarioDia } from './lib/schedule'
import Login from './components/Login'
import Fichaje from './components/Fichaje'
import Resumen from './components/Resumen'
import HorarioBase from './components/HorarioBase'


function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
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
    if (session) cargarHorarios()
  }, [session])

  async function cargarHorarios() {
    const { data } = await supabase.from('horarios_base').select('*')
    const porDia: (HorarioDia | null)[] = Array(7).fill(null)
    for (const h of data || []) {
      if (h.activo) porDia[h.dia_semana] = h
    }
    setHorariosPorDia(porDia)
  }

  if (cargando) return null
  if (!session) return <Login />

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">TempoMio</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Salir
          </button>
        </div>
        <Fichaje userId={session.user.id} horariosPorDia={horariosPorDia} />
        <Resumen horariosPorDia={horariosPorDia} />
        <HorarioBase userId={session.user.id} horariosPorDia={horariosPorDia} onActualizado={cargarHorarios} />
      </div>
    </div>
  )
}

export default App