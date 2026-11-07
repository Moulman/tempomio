import { describe, expect, it } from 'vitest'
import { LONGITUD_MINIMA, problemaContrasena, resultadoPedirEnlace } from './contrasena'

describe('problemaContrasena', () => {
    it('una contraseña larga y repetida igual vale', () => {
        expect(problemaContrasena('residencia-2026', 'residencia-2026')).toBeNull()
    })

    it(`pide al menos ${LONGITUD_MINIMA} caracteres`, () => {
        expect(problemaContrasena('12345', '12345')).toBe(`Usa al menos ${LONGITUD_MINIMA} caracteres.`)
    })

    it('un PIN de 6 cifras vale', () => {
        expect(problemaContrasena('482913', '482913')).toBeNull()
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

describe('resultadoPedirEnlace: el mensaje no revela si el email tiene cuenta', () => {
    it('sin error: enviado', () => {
        expect(resultadoPedirEnlace(null)).toBe('enviado')
    })

    it('429 (pedirlo otra vez enseguida solo falla si la cuenta existe): mismo mensaje que si se envía', () => {
        expect(resultadoPedirEnlace({ status: 429 })).toBe('enviado')
    })

    it('otros errores de la petición (4xx): mismo mensaje', () => {
        expect(resultadoPedirEnlace({ status: 400 })).toBe('enviado')
        expect(resultadoPedirEnlace({ status: 422 })).toBe('enviado')
    })

    it('solo los fallos del servidor o de red se enseñan como error', () => {
        expect(resultadoPedirEnlace({ status: 500 })).toBe('error')
        expect(resultadoPedirEnlace({ status: undefined })).toBe('error')
    })
})
