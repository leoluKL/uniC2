import { StrictMode } from 'react'
import '@fortawesome/fontawesome-free/css/all.min.css'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Keycloak from 'keycloak-js'
import AssetsManagement from './AssetsManagement/AssetsManagement.jsx'
import { appConfig } from './appConfig.js'

const keycloak = new Keycloak({
  url: appConfig.keycloakUrl,
  realm: appConfig.realm,
  clientId: appConfig.appKeycloakClientId
})

keycloak.init({ onLoad: 'login-required', checkLoginIframe: false }).then(authenticated => {
  if (authenticated) {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App keycloak={keycloak} />} />
            <Route path="/assetsmanagement" element={<AssetsManagement keycloak={keycloak} />} />
          </Routes>
        </BrowserRouter>
      </StrictMode>
    )
  } else keycloak.login()
}).catch(err => console.error('Keycloak init error:', err))