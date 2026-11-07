// Enlaces de los emails de Supabase (invitación y recuperar contraseña).
//
// El email NO lleva el enlace de un solo uso de Supabase directamente: lleva a
// /aceptar?token_hash=...&type=invite|recovery, una página de TempoMio con un botón. El
// código solo se gasta al pulsar el botón (verifyOtp). Así, los filtros de
// correo que abren los enlaces para revisarlos, o un doble clic, no lo gastan.
// invite: invitación de la admin · recovery: «¿Has olvidado tu contraseña?»
export type TipoEnlace = 'invite' | 'recovery'

export function leerEnlaceEmail(busqueda: string): { tokenHash: string; tipo: TipoEnlace } | null {
    const params = new URLSearchParams(busqueda)
    const tokenHash = params.get('token_hash')
    const tipo = params.get('type')
    if (!tokenHash || (tipo !== 'invite' && tipo !== 'recovery')) return null
    return { tokenHash, tipo }
}

// Enlaces antiguos (directos a Supabase) que ya se usaron o caducaron vuelven
// a la app con el error en la dirección: #error=access_denied&error_code=otp_expired...
export function enlaceCaducado(hash: string): boolean {
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    return params.get('error_code') === 'otp_expired'
}
