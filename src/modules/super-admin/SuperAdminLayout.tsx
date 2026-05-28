import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import SocietiesPage from './pages/SocietiesPage'
import AdminsPage from './pages/AdminsPage'
import WorkerAdminsPage from './pages/WorkerAdminsPage'
import ReportsPage from './pages/ReportsPage'
import LanguageToggle from '@/shared/components/LanguageToggle'

export default function SuperAdminLayout() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {/* Top bar (mobile only) */}
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-heading font-bold text-xs">M</span>
          </div>
          <span className="font-heading font-bold text-primary text-base flex-1">Super Admin</span>
          <LanguageToggle />
        </div>

        {/* Top bar (desktop only) */}
        <div className="hidden md:flex sticky top-0 z-40 bg-bg/80 backdrop-blur-sm px-8 py-3 justify-end">
          <LanguageToggle />
        </div>

        <div className="px-4 py-5 md:px-8 md:py-6">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"   element={<DashboardPage />} />
            <Route path="societies"   element={<SocietiesPage />} />
            <Route path="admins"         element={<AdminsPage />} />
            <Route path="worker-admins"  element={<WorkerAdminsPage />} />
            <Route path="reports"        element={<ReportsPage />} />
            <Route path="*"           element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
