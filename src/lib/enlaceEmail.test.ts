import { describe, expect, it } from 'vitest'
import { enlaceCaducado, leerEnlaceEmail } from './enlaceEmail'

describe('leerEnlaceEmail', () => {
    it('lee el código y el tipo de un enlace de invitación', () => {
        expect(leerEnlaceEmail('?token_hash=abc123&type=invite')).toEqual({ tokenHash: 'abc123', tipo: 'invite' })
    })

    it('sin código no hay enlace', () => {
        expect(leerEnlaceEmail('?type=invite')).toBeNull()
    })

    it('solo acepta invitaciones (otros tipos no los gestiona esta página)', () => {
        expect(leerEnlaceEmail('?token_hash=abc123&type=recovery')).toBeNull()
        expect(leerEnlaceEmail('?token_hash=abc123')).toBeNull()
    })
})

describe('enlaceCaducado', () => {
    it('detecta un enlace ya usado o caducado', () => {
        expect(enlaceCaducado('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')).toBe(true)
    })

    it('una dirección normal no es un error', () => {
        expect(enlaceCaducado('')).toBe(false)
        expect(enlaceCaducado('#access_token=x&type=invite')).toBe(false)
    })
})
