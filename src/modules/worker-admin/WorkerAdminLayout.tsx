import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { SquaresFour, ClipboardText, Users, SignOut, Buildings } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'
import { useAuthStore } from '@/shared/stores/authStore'
import { signOut } from '@/shared/services/authService'
import { APP_NAME } from '@/shared/utils/constants'
import WaDashboardPage from './pages/WaDashboardPage'
import WaKycPage       from './pages/WaKycPage'
import WaWorkersPage   from './pages/WaWorkersPage'

const navItems: { label: string; icon: Icon; path: string }[] = [
  { label: 'Dashboard',   icon: SquaresFour,   path: '/worker-admin/dashboard' },
  { label: 'KYC Reviews', icon: ClipboardText, path: '/worker-admin/kyc'       },
  { label: 'Workers',     icon: Users,         path: '/worker-admin/workers'   },
]

export default function WorkerAdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-primary min-h-screen">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-heading font-bold text-sm">M</span>
            </div>
            <span className="font-heading font-bold text-white text-lg">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Buildings size={12} weight="duotone" className="text-white/40" />
            <span className="text-white/40 text-xs font-body">Worker Admin</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ label, icon: Icon, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold font-body transition-all duration-150',
                  isActive ? 'bg-accent text-white' : 'text-white/60 hover:bg-white/10 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          {user?.name && (
            <p className="text-white/60 text-xs font-body px-3 mb-1 truncate">{user.name}</p>
          )}
          <p className="text-white/40 text-xs font-body px-3 mb-3 truncate">{user?.mobile}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold font-body text-white/60 hover:bg-white/10 hover:text-white transition-all duration-150"
          >
            <SignOut size={18} weight="regular" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-heading font-bold text-xs">M</span>
          </div>
          <span className="font-heading font-bold text-primary text-base flex-1">Worker Admin</span>
        </div>

        <div className="px-4 py-5 md:px-8 md:py-6">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<WaDashboardPage />} />
            <Route path="kyc"       element={<WaKycPage />} />
            <Route path="workers"   element={<WaWorkersPage />} />
            <Route path="*"         element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-primary z-50 flex border-t border-white/10">
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-body font-semibold transition-colors',
                isActive ? 'text-accent' : 'text-white/50',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
