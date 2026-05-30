import { NavLink, useNavigate } from 'react-router-dom'
import { SquaresFour, Buildings, Users, ChartBar, SignOut, UserGear } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'
import { useAuthStore } from '@/shared/stores/authStore'
import { signOut } from '@/shared/services/authService'
import Logo from '@/shared/components/Logo'

const navItems: { label: string; icon: Icon; path: string }[] = [
  { label: 'Dashboard',     icon: SquaresFour, path: '/super-admin/dashboard'     },
  { label: 'Societies',     icon: Buildings,   path: '/super-admin/societies'     },
  { label: 'RWA Admins',    icon: Users,       path: '/super-admin/admins'        },
  { label: 'Worker Admins', icon: UserGear,    path: '/super-admin/worker-admins' },
  { label: 'Reports',       icon: ChartBar,    path: '/super-admin/reports'       },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-primary min-h-screen">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="bg-white rounded-xl px-3 py-2 inline-flex">
            <Logo height={36} />
          </div>
          <span className="text-white/40 text-xs font-body mt-2 block">Super Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ label, icon: Icon, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold font-body transition-all duration-150',
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
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

        {/* User + Logout */}
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

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-primary z-50 flex border-t border-white/10">
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-body font-semibold transition-colors',
                isActive ? 'text-accent' : 'text-white/50'
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
    </>
  )
}
