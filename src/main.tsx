import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// PWA: cuando hay una versión nueva, se instala y la página se recarga sola
// (registerType 'autoUpdate' en vite.config.ts). Además se comprueba cada hora
// por si la app se queda abierta todo el día.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    if (registro) setInterval(() => registro.update(), 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)