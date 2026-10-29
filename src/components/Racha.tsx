import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { calcularRacha, fechaLocal } from '../lib/schedule'

interface Props {
    userId: string
    // Cambia al fichar para recalcular la racha
    recarga: number
}

// Máximo de días que se miran hacia atrás
const DIAS_MAXIMOS = 400

// "🔥 X días seguidos fichando". Con racha 0 no se muestra nada (no desmotivar).
export default function Racha({ userId, recarga }: Props) {
    const [racha, setRacha] = useState(0)

    useEffect(() => {
        let cancelado = false
        const hoy = new Date()
        supabase
            .from('fichajes')
            .select('fecha')
            .eq('user_id', userId)
            .not('hora_entrada', 'is', null)
            .lte('fecha', fechaLocal(hoy))
            .order('fecha', { ascending: false })
            .limit(DIAS_MAXIMOS)
            .then(({ data }) => {
                if (cancelado) return
                setRacha(calcularRacha((data || []).map((f) => f.fecha), hoy))
            })
        return () => { cancelado = true }
    }, [userId, recarga])

    if (racha === 0) return null

    return (
        <p className="text-sm text-aviso mt-1">
            🔥 {racha} {racha === 1 ? 'día seguido' : 'días seguidos'} fichando
        </p>
    )
}
