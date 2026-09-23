import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
// Full-page workspace navigation keeps the two designs' global styles isolated.
const Workspace = lazy(window.location.pathname.replace(/\/+$/, '') === '/simulator'
  ? () => import('./SimulatorWorkspace') : () => import('./App'))

createRoot(document.getElementById('root')!).render(
  <StrictMode><Suspense fallback={<p role="status">Loading Astana…</p>}><Workspace /></Suspense></StrictMode>,
)
