import { Routes, Route, Navigate } from 'react-router-dom'
import { ProviderProvider, useProvider } from './components/ProviderContext'
import ProviderSidebar from './components/ProviderSidebar'
import OnboardingWizard from './OnboardingWizard'
import ProviderDashboardPage from './pages/ProviderDashboardPage'
import ProviderProfilePage from './pages/ProviderProfilePage'
import EditServicesPage from './pages/EditServicesPage'
import EditTimingsPage from './pages/EditTimingsPage'
import KycPage from './pages/KycPage'
import BookingsPage from './pages/BookingsPage'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import LanguageToggle from '@/shared/components/LanguageToggle'

function ProviderShell() {
  const { provider, isLoading } = useProvider()

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
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-heading font-bold text-xs">M</span>
          </div>
          <span className="font-heading font-bold text-primary text-base flex-1">MaidEzy</span>
          <LanguageToggle />
        </div>

        <div className="hidden md:flex sticky top-0 z-40 bg-bg/80 backdrop-blur-sm px-8 py-3 justify-end">
          <LanguageToggle />
        </div>

        <div className="px-4 py-5 md:px-8 md:py-6">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ProviderDashboardPage />} />
            <Route path="profile"        element={<ProviderProfilePage />} />
            <Route path="edit-services"  element={<EditServicesPage />} />
            <Route path="edit-timings"   element={<EditTimingsPage />} />
            <Route path="kyc"            element={<KycPage />} />
            <Route path="bookings"  element={<BookingsPage />} />
            <Route path="*"         element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>
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
