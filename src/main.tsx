import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './state/AppContext'
import { AuthProvider } from './state/AuthContext'
import { SyncProvider } from './state/SyncContext'
import { SyncGate } from './components/SyncGate'
import { SpotifyProvider } from './state/SpotifyContext'
import { App } from './App'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root introuvable')

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <SyncProvider>
          <SpotifyProvider>
            <SyncGate>
              <App />
            </SyncGate>
          </SpotifyProvider>
        </SyncProvider>
      </AppProvider>
    </AuthProvider>
  </StrictMode>,
)
