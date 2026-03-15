import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Hide Vercel Toolbar in Production (Auditor Request)
if (import.meta.env.MODE === 'production') {
  window.VERCEL_TOOLBAR_HIDDEN = true;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
