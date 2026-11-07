// Reglas para elegir contraseña al aceptar una invitación.
// 6 es el mínimo de Supabase (minimum_password_length): un PIN de 6 cifras
// vale. Menos no: una web se puede atacar probando contraseñas desde fuera,
// no se bloquea tras unos intentos como el PIN del móvil.
export const LONGITUD_MINIMA = 6

// Devuelve el problema a mostrar, o null si la contraseña vale
export function problemaContrasena(contrasena: string, repetida: string): string | null {
    if (contrasena.length < LONGITUD_MINIMA) return `Usa al menos ${LONGITUD_MINIMA} caracteres.`
    if (contrasena.trim() !== contrasena) return 'Sin espacios al principio ni al final.'
    if (contrasena !== repetida) return 'Las dos contraseñas no coinciden.'
    return null
}

// Qué enseñar tras pedir el enlace de «¿Has olvidado tu contraseña?». Nunca debe
// revelar si el email tiene cuenta: Supabase responde 429 a la segunda petición
// seguida SOLO si la cuenta existe. Cualquier respuesta 4xx se trata como enviada;
// solo un fallo del servidor (5xx) o de red (sin status) se enseña como error.
export function resultadoPedirEnlace(error: { status?: number } | null): 'enviado' | 'error' {
    if (!error) return 'enviado'
    return error.status !== undefined && error.status < 500 ? 'enviado' : 'error'
}
