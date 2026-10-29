// Reglas para elegir contraseña al aceptar una invitación.
// Supabase exige un mínimo en el servidor (minimum_password_length); la app
// pide algo más largo y lo comprueba antes de enviar.
export const LONGITUD_MINIMA = 8

// Devuelve el problema a mostrar, o null si la contraseña vale
export function problemaContrasena(contrasena: string, repetida: string): string | null {
    if (contrasena.length < LONGITUD_MINIMA) return `Usa al menos ${LONGITUD_MINIMA} caracteres.`
    if (contrasena.trim() !== contrasena) return 'Sin espacios al principio ni al final.'
    if (contrasena !== repetida) return 'Las dos contraseñas no coinciden.'
    return null
}
