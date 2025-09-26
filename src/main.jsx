import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Only use the service worker in production builds.
// In dev, unregister any existing SW to avoid stale caches and HMR issues.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err)
      })
    })
  } else if (typeof navigator.serviceWorker.getRegistrations === 'function') {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((reg) => reg.unregister())
      })
      .catch(() => {})
  }
}
