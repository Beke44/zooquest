import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './i18n'
import App from './App'
import { StoreProvider } from './lib/store'
import { ParkProvider } from './lib/park'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <ParkProvider>
        <App />
      </ParkProvider>
    </StoreProvider>
  </StrictMode>,
)

// Offline support (park pack + visited map tiles). Skipped in dev and in
// sandboxed previews where service workers aren't allowed.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
