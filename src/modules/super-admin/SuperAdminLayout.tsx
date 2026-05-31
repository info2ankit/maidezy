import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { SignOut } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import SocietiesPage from './pages/SocietiesPage'
import AdminsPage from './pages/AdminsPage'
import WorkerAdminsPage from './pages/WorkerAdminsPage'
import ReportsPage from './pages/ReportsPage'
import LanguageToggle from '@/shared/components/LanguageToggle'
import NotificationsBell from '@/shared/components/NotificationsBell'
import Logo from '@/shared/components/Logo'
import { useAuthStore } from '@/shared/stores/authStore'
import { signOut } from '@/shared/services/authService'

function AnimatedRoutes() {
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
          <Route path="dashboard"      element={<DashboardPage />} />
          <Route path="societies"      element={<SocietiesPage />} />
          <Route path="admins"         element={<AdminsPage />} />
          <Route path="worker-admins"  element={<WorkerAdminsPage />} />
          <Route path="reports"        element={<ReportsPage />} />
          <Route path="*"              element={<Navigate to="dashboard" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function SuperAdminLayout() {
  const navigate = useNavigate()
  const logout   = useAuthStore((s) => s.logout)

  async function handleLogout() {
    await signOut()
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {/* Top bar (mobile only) */}
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3">
          <Logo height={28} />
          <span className="font-body text-xs text-gray-400 flex-1">Super Admin</span>
          <NotificationsBell />
          <LanguageToggle />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-danger-light flex items-center justify-center text-gray-500 hover:text-danger transition-colors"
          >
            <SignOut size={16} weight="bold" />
          </button>
        </div>

        {/* Top bar (desktop only) */}
        <div className="hidden md:flex sticky top-0 z-40 bg-bg/80 backdrop-blur-sm px-8 py-3 justify-end items-center gap-3">
          <NotificationsBell />
          <LanguageToggle />
        </div>

        <div className="px-4 py-5 md:px-8 md:py-6">
          <AnimatedRoutes />
        </div>
      </main>
    </div>
  )
}
