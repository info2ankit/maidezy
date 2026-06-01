import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { ProviderProvider, useProvider } from './components/ProviderContext'
import { useAuthStore } from '@/shared/stores/authStore'
import ProviderSidebar from './components/ProviderSidebar'
import OnboardingWizard from './OnboardingWizard'
import ProviderDashboardPage from './pages/ProviderDashboardPage'
import ProviderProfilePage from './pages/ProviderProfilePage'
import EditServicesPage from './pages/EditServicesPage'
import EditTimingsPage from './pages/EditTimingsPage'
import KycPage from './pages/KycPage'
import BookingsPage from './pages/BookingsPage'
import BookingRequestScreen from './screens/BookingRequestScreen'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import LanguageToggle from '@/shared/components/LanguageToggle'
import NotificationsBell from '@/shared/components/NotificationsBell'
import PushOptInBanner from '@/shared/components/PushOptInBanner'
import PushDebugPanel from '@/shared/components/PushDebugPanel'
import Logo from '@/shared/components/Logo'
import { onForegroundMessage, autoRegisterPush } from '@/lib/push'

function ProviderAnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="will-change-transform"
      >
        <Routes location={location}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"      element={<ProviderDashboardPage />} />
          <Route path="profile"        element={<ProviderProfilePage />} />
          <Route path="edit-services"  element={<EditServicesPage />} />
          <Route path="edit-timings"   element={<EditTimingsPage />} />
          <Route path="kyc"            element={<KycPage />} />
          <Route path="requests"       element={<BookingRequestScreen />} />
          <Route path="bookings"       element={<BookingsPage />} />
          <Route path="*"              element={<Navigate to="dashboard" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function ProviderShell() {
  const { provider, isLoading } = useProvider()
  const userId = useAuthStore((s) => s.user?.id)

  // Re-bind the FCM token to this user on every login so a device that was
  // previously used by another user stops delivering their notifications.
  useEffect(() => {
    if (userId) autoRegisterPush(userId).catch(() => {})
  }, [userId])

  // Show OS notification for FCM messages that arrive while the app is open.
  // The SW background handler only fires when the tab is hidden/closed.
  useEffect(() => {
    return onForegroundMessage(({ title, body }) => {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon-192x192.png' })
      }
    })
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <LoadingSpinner />
      </div>
    )
  }

  // Onboarding gate: no provider row → force the wizard before anything else.
  // The wizard layout owns its own LanguageToggle placement.
  if (!provider) return <OnboardingWizard />

  return (
    <div className="flex min-h-screen bg-bg">
      <ProviderSidebar />

      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3">
          <Logo height={28} />
          <div className="flex-1" />
          <NotificationsBell />
          <LanguageToggle />
        </div>

        <div className="hidden md:flex sticky top-0 z-40 bg-bg/80 backdrop-blur-sm px-8 py-3 justify-end items-center gap-3">
          <NotificationsBell />
          <LanguageToggle />
        </div>

        <PushOptInBanner />

        <div className="px-4 py-5 md:px-8 md:py-6">
          <ProviderAnimatedRoutes />
        </div>
      </main>

      <PushDebugPanel />
    </div>
  )
}

export default function ServiceProviderLayout() {
  return (
    <ProviderProvider>
      <ProviderShell />
    </ProviderProvider>
  )
}
