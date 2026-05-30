import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { SquaresFour, ClipboardText, Users, SignOut, Buildings, CalendarCheck } from '@phosphor-icons/react'
import NotificationsBell from '@/shared/components/NotificationsBell'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'
import { useAuthStore } from '@/shared/stores/authStore'
import { signOut } from '@/shared/services/authService'
import Logo from '@/shared/components/Logo'
import WaDashboardPage from './pages/WaDashboardPage'
import WaKycPage       from './pages/WaKycPage'
import WaWorkersPage   from './pages/WaWorkersPage'
import WaBookingsPage  from './pages/WaBookingsPage'

const navItems: { label: string; icon: Icon; path: string }[] = [
  { label: 'Dashboard',   icon: SquaresFour,    path: '/worker-admin/dashboard' },
  { label: 'Bookings',    icon: CalendarCheck,  path: '/worker-admin/bookings'  },
  { label: 'KYC Reviews', icon: ClipboardText,  path: '/worker-admin/kyc'       },
  { label: 'Workers',     icon: Users,          path: '/worker-admin/workers'   },
]

export default function WorkerAdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-primary min-h-screen">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="bg-white rounded-xl px-3 py-2 inline-flex">
            <Logo height={36} />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
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
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3">
          <Logo height={28} />
          <span className="font-body text-xs text-gray-400 flex-1">Worker Admin</span>
          <NotificationsBell />
        </div>

        <div className="px-4 py-5 md:px-8 md:py-6">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<WaDashboardPage />} />
            <Route path="bookings"  element={<WaBookingsPage />} />
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
