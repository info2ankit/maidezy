import { Routes, Route, Navigate } from 'react-router-dom'
import RwaSidebar from './components/RwaSidebar'
import RwaDashboardPage from './pages/RwaDashboardPage'
import ResidentsPage from './pages/ResidentsPage'
import ServicesPage from './pages/ServicesPage'
import ComplaintsPage from './pages/ComplaintsPage'
import SettingsPage from './pages/SettingsPage'

export default function RwaAdminLayout() {
  return (
    <div className="flex min-h-screen bg-bg">
      <RwaSidebar />

      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-heading font-bold text-xs">M</span>
          </div>
          <span className="font-heading font-bold text-primary text-base">RWA Admin</span>
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
