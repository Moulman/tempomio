// Iconos de trazo propios (24×24, heredan el color del texto)
import type { ReactNode, SVGProps } from 'react'

function Icono({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            {children}
        </svg>
    )
}

type P = SVGProps<SVGSVGElement>

export const IconoHoy = (p: P) => (
    <Icono {...p}>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9.5 2.5h5" />
    </Icono>
)

// Jornada terminada (botón central de la barra del móvil)
export const IconoHecho = (p: P) => (
    <Icono strokeWidth="2.2" {...p}>
        <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icono>
)

export const IconoSemana = (p: P) => (
    <Icono {...p}>
        <path d="M4 6h16M4 12h16M4 18h10" />
    </Icono>
)

export const IconoBolsa = (p: P) => (
    <Icono {...p}>
        <path d="M5 8h14l-1 11.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2M12 12v3.5l2 1.2" />
    </Icono>
)

export const IconoHistorial = (p: P) => (
    <Icono {...p}>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Icono>
)

export const IconoIdeas = (p: P) => (
    <Icono {...p}>
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
    </Icono>
)

export const IconoPerfil = (p: P) => (
    <Icono {...p}>
        <circle cx="12" cy="8.5" r="3.8" />
        <path d="M4.5 20.5c1.3-3.6 4.2-5.5 7.5-5.5s6.2 1.9 7.5 5.5" />
    </Icono>
)

export const IconoAdmin = (p: P) => (
    <Icono {...p}>
        <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z" />
        <path d="m9 12 2 2 4-4" />
    </Icono>
)

export const IconoSol = (p: P) => (
    <Icono {...p}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </Icono>
)

export const IconoLuna = (p: P) => (
    <Icono {...p}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </Icono>
)

export const IconoSalir = (p: P) => (
    <Icono {...p}>
        <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l4-4-4-4M14 12H4" />
    </Icono>
)

// Marca de TempoMio: esfera con un arco de progreso
export const Marca = (p: P) => (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" {...p}>
        <rect width="32" height="32" rx="9" fill="var(--acento)" />
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="var(--sobre-acento)" strokeOpacity="0.35" strokeWidth="2.6" />
        <path d="M16 7.5a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="var(--sobre-acento)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2" fill="var(--sobre-acento)" />
    </svg>
)
