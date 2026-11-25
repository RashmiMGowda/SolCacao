import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { AboutPage } from './features/auth/pages/AboutPage'
import { AdminPage } from './features/auth/pages/AdminPage'
import { BusinessProfilePage } from './features/auth/pages/BusinessProfilePage'
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage'
import { HomePage } from './features/auth/pages/HomePage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { ProfilePage } from './features/auth/pages/ProfilePage'
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage'
import { UnauthorizedPage } from './features/auth/pages/UnauthorizedPage'
import { CartPage } from './features/catalog/pages/CartPage'
import { CatalogPage } from './features/catalog/pages/CatalogPage'
import { CheckoutPage } from './features/catalog/pages/CheckoutPage'
import { OrderConfirmationPage } from './features/catalog/pages/OrderConfirmationPage'
import { ProductDetailPage } from './features/catalog/pages/ProductDetailPage'
import B2BPage from './features/b2b/pages/B2BPage.jsx'
import B2BWizardPage from './features/b2b/pages/B2BWizardPage.jsx'
import BusinessGate from './features/b2b/components/BusinessGate.jsx'
import B2BRequestsPage from './features/b2b/pages/B2BRequestsPage.jsx'
import B2BAccountsPage from './features/b2b/pages/B2BAccountsPage.jsx'
import ContactFeedbackPage from './features/contact_feedback_sampler/ContactFeedbackPage'
import ContactConfirmationPage from './features/contact_feedback_sampler/ContactConfirmationPage'
import SamplerPage from './features/contact_feedback_sampler/SamplerPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="profile" element={<ProtectedRoute allowedRoles={['CUSTOMER']} allowedAccountTypes={['RETAIL']}><ProfilePage /></ProtectedRoute>} />
        <Route path="business-profile" element={<ProtectedRoute allowedRoles={['BUSINESS']} allowedAccountTypes={['B2B']}><BusinessProfilePage /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminPage /></ProtectedRoute>} />
        <Route path="shop" element={<CatalogPage />} />
        <Route path="shop/:productId" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order-confirmation/:orderId" element={<OrderConfirmationPage />} />
        <Route path="sampler" element={<SamplerPage />} />
        <Route path="business" element={<B2BPage />} />
        <Route path="business/quote" element={<BusinessGate><B2BWizardPage /></BusinessGate>} />
        <Route path="business/requests" element={<BusinessGate><B2BRequestsPage /></BusinessGate>} />
        <Route path="business/requests/:id" element={<BusinessGate><B2BRequestsPage /></BusinessGate>} />
        <Route path="business/manage" element={<BusinessGate admin><B2BRequestsPage admin /></BusinessGate>} />
        <Route path="business/manage/:id" element={<BusinessGate admin><B2BRequestsPage admin /></BusinessGate>} />
        <Route path="business/accounts" element={<BusinessGate admin><B2BAccountsPage /></BusinessGate>} />
        <Route path="b2b" element={<Navigate to="/business" replace />} />
        <Route path="b2b/quote" element={<Navigate to="/business/quote" replace />} />
        <Route path="contact" element={<ContactFeedbackPage />} />
        <Route path="contact-confirmation" element={<ContactConfirmationPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
