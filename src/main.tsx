import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './state/AppContext'
import { SpotifyProvider } from './state/SpotifyContext'
import { App } from './App'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root introuvable')

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <SpotifyProvider>
        <App />
      </SpotifyProvider>
    </AppProvider>
  </StrictMode>,
)
