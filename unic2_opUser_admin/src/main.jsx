import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AssetsManagement from './assetsManagement/AssetsManagement.jsx'
import { AuthProvider } from './AuthProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/assetsmanagement" element={<AssetsManagement />} /> 
        </Routes>
      </BrowserRouter>
    </AuthProvider>

  </StrictMode>,
)
