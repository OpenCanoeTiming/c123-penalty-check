import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Design system CSS - tokens first, then components
import '@opencanoetiming/timing-design-system/src/tokens/index.css'
import '@opencanoetiming/timing-design-system/src/css/index.css'
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
