import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import { registrarServiceWorker } from './lib/push'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// O service worker é quem mostra os avisos com o app fechado. Registrar aqui,
// depois da tela montada, é de graça e não atrapalha nada: ele não intercepta
// pedido nenhum. Sem ele registrado, o membro nem consegue ligar os avisos.
registrarServiceWorker()
