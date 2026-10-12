import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { BookingProvider } from './booking/BookingContext'
import { AdminLayout } from './components/admin/AdminLayout'
import { Layout } from './components/layout/Layout'
import { ScrollManager } from './components/layout/ScrollManager'
import { AboutPage } from './pages/AboutPage'
import { AccountPage } from './pages/AccountPage'
import { CheckInPage } from './pages/CheckInPage'
import { CheckoutConfirmationPage } from './pages/CheckoutConfirmationPage'
import { CheckoutDetailsPage } from './pages/CheckoutDetailsPage'
import { CheckoutPaymentPage } from './pages/CheckoutPaymentPage'
import { CheckoutReviewPage } from './pages/CheckoutReviewPage'
import { ContactPage } from './pages/ContactPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventsPage } from './pages/EventsPage'
import { ExperiencePage } from './pages/ExperiencePage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { GalleryPage } from './pages/GalleryPage'
import { HomePage } from './pages/HomePage'
import { LegalPage } from './pages/LegalPage'
import { MyTicketDetailPage } from './pages/MyTicketDetailPage'
import { MyTicketsPage } from './pages/MyTicketsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { TicketsPage } from './pages/TicketsPage'
import { UnsubscribePage } from './pages/UnsubscribePage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { AdminBookingDetailPage } from './pages/admin/AdminBookingDetailPage'
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminEventEditorPage } from './pages/admin/AdminEventEditorPage'
import { AdminEventsPage } from './pages/admin/AdminEventsPage'
import { AdminGalleryPage } from './pages/admin/AdminGalleryPage'
import { AdminPromosPage } from './pages/admin/AdminPromosPage'
import { AdminReportsPage } from './pages/admin/AdminReportsPage'
import { AdminSubscribersPage } from './pages/admin/AdminSubscribersPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingProvider>
          <ScrollManager />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="events/:slug" element={<EventDetailPage />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="checkout/details" element={<CheckoutDetailsPage />} />
              <Route path="checkout/review" element={<CheckoutReviewPage />} />
              <Route path="checkout/payment" element={<CheckoutPaymentPage />} />
              <Route path="checkout/confirmation" element={<CheckoutConfirmationPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="experience" element={<ExperiencePage />} />
              <Route path="gallery" element={<GalleryPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="my-tickets" element={<MyTicketsPage />} />
              <Route path="my-tickets/:reference" element={<MyTicketDetailPage />} />
              <Route path="verify-email" element={<VerifyEmailPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="unsubscribe" element={<UnsubscribePage />} />
              <Route path="admin/check-in" element={<CheckInPage />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="events" element={<AdminEventsPage />} />
                <Route path="events/new" element={<AdminEventEditorPage />} />
                <Route path="events/:id" element={<AdminEventEditorPage />} />
                <Route path="bookings" element={<AdminBookingsPage />} />
                <Route path="bookings/:reference" element={<AdminBookingDetailPage />} />
                <Route path="promos" element={<AdminPromosPage />} />
                <Route path="gallery" element={<AdminGalleryPage />} />
                <Route path="subscribers" element={<AdminSubscribersPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
              </Route>
              <Route path="account" element={<AccountPage />} />
              <Route path="privacy" element={<LegalPage kind="privacy" />} />
              <Route path="terms" element={<LegalPage kind="terms" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BookingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
