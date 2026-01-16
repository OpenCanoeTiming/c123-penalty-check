import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@opencanoetiming/timing-design-system/dist/timing.css'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
