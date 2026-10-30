import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: Web 公開版のみ Service Worker を登録（Electron では使わない）
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js')
}
