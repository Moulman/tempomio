---
paths:
  - "src/**/*.{ts,tsx}"
---

# Frontend (React + TypeScript + Tailwind)

## TypeScript y lint
- `verbatimModuleSyntax`: importa los tipos con `import type`.
- `erasableSyntaxOnly`: nada de `enum`, `namespace` ni propiedades en parámetros de constructor.
- `noUnusedLocals` y `noUnusedParameters` están activos: no dejes código sin usar.
- ESLint con `react-hooks`: las cargas de datos van dentro de `useEffect`. `npm run lint` debe quedar sin errores.

## Estilo
- 4 espacios, comillas simples, sin punto y coma.
- Componentes como `export default function Nombre`, con las props en `interface Props`. Las páginas se llaman `PaginaX`.
- La lógica pura va en `src/lib/` y los componentes se quedan en presentación y estado local.
- Todo acceso a `localStorage` va en `try/catch`, como en `src/lib/tema.ts`.

## Diseño y tema
- Colores solo con los tokens de `src/index.css`: `fondo`, `superficie`, `realce`, `linea`, `tinta`, `tinta-suave`, `tinta-tenue`, `acento`, `sobre-acento`, `positivo`, `negativo`, `aviso` (por ejemplo `bg-superficie`, `text-tinta`, `border-linea`).
- No uses colores sueltos (`slate-*`, `sky-*`, `#hex`): se rompen en uno de los dos temas.
- Móvil primero, con áreas táctiles cómodas y foco visible en lo interactivo. Comprueba tema claro y oscuro.

## Textos de la interfaz
- En español, tono cercano y directo, frases cortas. Un botón dice exactamente lo que hace ("Marcar entrada") y la misma acción se llama igual en toda la app.
- Los errores explican qué pasó y cómo arreglarlo.
