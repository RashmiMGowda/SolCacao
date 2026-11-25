import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './features/auth/context/AuthContext.jsx'
import { CartProvider } from './features/catalog/context/CartContext.jsx'
import { LocalizationProvider } from './features/localization/context/LocalizationContext.jsx'
import { ToastProvider } from './shared/toast/ToastProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LocalizationProvider>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </LocalizationProvider>
    </BrowserRouter>
  </StrictMode>,
)
