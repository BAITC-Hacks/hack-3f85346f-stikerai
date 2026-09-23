import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './futuristic.css'
import './futuristic-light.css'
import './city-orbit.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
