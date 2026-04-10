import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Polyfills pour la compatibilité des bibliothèques Node-dependent (comme sockjs-client) avec Vite
if (typeof window !== 'undefined') {
  window.global = window;
  window.process = { env: {} };
}

import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)