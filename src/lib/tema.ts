import { useState } from 'react'

export type Tema = 'claro' | 'oscuro'

// Misma clave que el script de index.html, que aplica el tema antes de pintar
const CLAVE = 'tempomio-tema'

// Color de la barra del navegador / PWA en cada tema (igual que --fondo en index.css)
const COLOR_BARRA: Record<Tema, string> = { claro: '#f5f3ef', oscuro: '#13171d' }

function temaGuardado(): Tema | null {
    try {
        const valor = localStorage.getItem(CLAVE)
        return valor === 'claro' || valor === 'oscuro' ? valor : null
    } catch {
        return null
    }
}

// Sin elección guardada, se sigue el tema del sistema
export function temaInicial(): Tema {
    return temaGuardado() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro')
}

function aplicarTema(tema: Tema) {
    document.documentElement.dataset.tema = tema
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema])
    try {
        localStorage.setItem(CLAVE, tema)
    } catch {
        // Sin almacenamiento (modo privado): el tema se aplica igual, solo no se recuerda
    }
}

export function useTema() {
    const [tema, setTema] = useState<Tema>(temaInicial)

    function alternarTema() {
        const nuevo: Tema = tema === 'claro' ? 'oscuro' : 'claro'
        aplicarTema(nuevo)
        setTema(nuevo)
    }

    return { tema, alternarTema }
}
