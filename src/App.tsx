import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [estado, setEstado] = useState('Comprobando conexión...')

  useEffect(() => {
    async function probarConexion() {
      const { error } = await supabase.from('fichajes').select('*').limit(1)
      if (error) {
        setEstado('Error: ' + error.message)
      } else {
        setEstado('✅ Conexión con Supabase correcta')
      }
    }
    probarConexion()
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>TempoMio</h1>
      <p>{estado}</p>
    </div>
  )
}

export default App