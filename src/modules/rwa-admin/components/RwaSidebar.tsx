import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Home, Briefcase, MessageSquareWarning, Settings, LogOut } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useAuthStore } from '@/shared/stores/authStore'
import { signOut } from '@/shared/services/authService'
import { APP_NAME } from '@/shared/utils/constants'

const navItems = [
  { label: 'Dashboard',  icon: LayoutDashboard,       path: '/rwa-admin/dashboard'  },
  { label: 'Residents',  icon: Home,                  path: '/rwa-admin/residents'  },
  { label: 'Services',   icon: Briefcase,             path: '/rwa-admin/services'   },
  { label: 'Complaints', icon: MessageSquareWarning,  path: '/rwa-admin/complaints' },
  { label: 'Settings',   icon: Settings,              path: '/rwa-admin/settings'   },
]

export default function RwaSidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-primary min-h-screen">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-heading font-bold text-sm">M</span>
            </div>
            <span className="font-heading font-bold text-white text-lg">{APP_NAME}</span>
          </div>
          <span className="text-white/40 text-xs font-body mt-1 block">RWA Admin</span>
        </div>

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
              <Icon size={18} />
              {label}
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
            <LogOut size={18} />
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
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-body font-semibold transition-colors',
                isActive ? 'text-accent' : 'text-white/50'
              )
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
