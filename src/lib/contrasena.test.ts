import { describe, expect, it } from 'vitest'
import { LONGITUD_MINIMA, problemaContrasena } from './contrasena'

describe('problemaContrasena', () => {
    it('una contraseña larga y repetida igual vale', () => {
        expect(problemaContrasena('residencia-2026', 'residencia-2026')).toBeNull()
    })

    it(`pide al menos ${LONGITUD_MINIMA} caracteres`, () => {
        expect(problemaContrasena('corta1', 'corta1')).toBe(`Usa al menos ${LONGITUD_MINIMA} caracteres.`)
    })

    it('avisa si las dos no coinciden', () => {
        expect(problemaContrasena('residencia-2026', 'residencia-2027')).toBe('Las dos contraseñas no coinciden.')
    })

    it('no acepta espacios al principio ni al final (suelen colarse al pegar)', () => {
        expect(problemaContrasena(' residencia-2026', ' residencia-2026')).toBe('Sin espacios al principio ni al final.')
    })

    it('primero avisa de la longitud, aunque tampoco coincidan', () => {
        expect(problemaContrasena('abc', 'xyz')).toBe(`Usa al menos ${LONGITUD_MINIMA} caracteres.`)
    })
})
