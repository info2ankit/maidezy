import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import RwaSidebar from './components/RwaSidebar'
import RwaDashboardPage from './pages/RwaDashboardPage'
import ResidentsPage from './pages/ResidentsPage'
import ServicesPage from './pages/ServicesPage'
import ComplaintsPage from './pages/ComplaintsPage'
import SettingsPage from './pages/SettingsPage'
import LanguageToggle from '@/shared/components/LanguageToggle'
import NotificationsBell from '@/shared/components/NotificationsBell'
import Logo from '@/shared/components/Logo'
import { useAuthStore } from '@/shared/stores/authStore'

export default function RwaAdminLayout() {
  // When the viewer is a resident wearing the RWA-admin hat, surface a quick
  // path back to their resident portal.
  const isResidentAdmin = useAuthStore((s) => s.role === 'resident' && s.isRwaAdmin)

  return (
    <div className="flex min-h-screen bg-bg">
      <RwaSidebar />

      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3">
          {isResidentAdmin ? (
            <Link
              to="/resident/home"
              className="inline-flex items-center gap-1 text-xs font-body font-semibold text-primary"
              aria-label="Back to resident"
            >
              <ArrowLeft size={14} weight="bold" />
              Resident
            </Link>
          ) : (
            <Logo height={28} />
          )}
          <span className="font-body text-xs text-gray-400 flex-1 ml-2">RWA Admin</span>
          <NotificationsBell />
          <LanguageToggle />
        </div>

        <div className="hidden md:flex sticky top-0 z-40 bg-bg/80 backdrop-blur-sm px-8 py-3 justify-end items-center gap-3">
          <NotificationsBell />
          <LanguageToggle />
        </div>

        <div className="px-4 py-5 md:px-8 md:py-6">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<RwaDashboardPage />} />
            <Route path="residents"  element={<ResidentsPage />} />
            <Route path="services"   element={<ServicesPage />} />
            <Route path="complaints" element={<ComplaintsPage />} />
            <Route path="settings"   element={<SettingsPage />} />
            <Route path="*"          element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
