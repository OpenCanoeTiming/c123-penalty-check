import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@opencanoetiming/timing-design-system/dist/timing.css'
import './index.css'
import App from './App.tsx'
import { ToastProvider, ErrorBoundary } from './components'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
