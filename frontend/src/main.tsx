import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
// Keep the previous workspace available at an explicit archive route.
// The main app, including /simulator, always uses the Akim workspace design.
const Workspace = lazy(window.location.pathname.replace(/\/+$/, '') === '/legacy-simulator'
  ? () => import('./SimulatorWorkspace') : () => import('./App'))

createRoot(document.getElementById('root')!).render(
  <StrictMode><Suspense fallback={<p role="status">Loading Astana…</p>}><Workspace /></Suspense></StrictMode>,
)
