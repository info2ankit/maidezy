import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  SquaresFour, UserCircle, ShieldCheck, CalendarCheck, SignOut, BellRinging,
} from '@phosphor-icons/react'
import { motion, LayoutGroup } from 'framer-motion'
import { SPRING, SPRING_SNAPPY } from '@/shared/utils/motion'
import { cn } from '@/shared/utils/cn'
import { useAuthStore } from '@/shared/stores/authStore'
import { signOut } from '@/shared/services/authService'
import Logo from '@/shared/components/Logo'

const NAV_ITEMS = [
  { key: 'dashboard', icon: SquaresFour,   path: '/provider/dashboard' },
  { key: 'requests',  icon: BellRinging,   path: '/provider/requests'  },
  { key: 'bookings',  icon: CalendarCheck, path: '/provider/bookings'  },
  { key: 'profile',   icon: UserCircle,    path: '/provider/profile'   },
  { key: 'kyc',       icon: ShieldCheck,   path: '/provider/kyc'       },
] as const

export default function ProviderSidebar() {
  const { t } = useTranslation('worker')
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
        <div className="px-5 py-5 border-b border-white/10">
          <div className="bg-white rounded-xl px-3 py-2 inline-flex">
            <Logo height={36} />
          </div>
          <span className="text-white/40 text-xs font-body mt-2 block">{t('nav.provider_label')}</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <LayoutGroup id="provider-sidebar-nav">
            {NAV_ITEMS.map(({ key, icon: Icon, path }, i) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold font-body transition-colors',
                    isActive ? 'text-white' : 'text-white/60 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="provider-nav-bg"
                        className="absolute inset-0 bg-accent rounded-xl"
                        transition={SPRING_SNAPPY}
                      />
                    )}
                    <motion.div
                      className="relative z-10"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...SPRING, delay: i * 0.05 }}
                    >
                      <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                    </motion.div>
                    <span className="relative z-10">{t(`nav.${key}`)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </LayoutGroup>
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
            <SignOut size={20} weight="regular" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-primary z-50 flex border-t border-white/10">
        <LayoutGroup id="provider-bottom-nav">
          {NAV_ITEMS.map(({ key, icon: Icon, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-body font-semibold transition-colors',
                  isActive ? 'text-accent' : 'text-white/50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="provider-bottom-pill"
                      className="absolute top-0 inset-x-3 h-[3px] bg-accent rounded-full"
                      transition={SPRING_SNAPPY}
                    />
                  )}
                  <motion.div
                    animate={{ scale: isActive ? 1.18 : 1, y: isActive ? -1 : 0 }}
                    transition={SPRING}
                  >
                    <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                  </motion.div>
                  <span>{t(`nav.${key}`)}</span>
                </>
              )}
            </NavLink>
          ))}
        </LayoutGroup>
      </nav>
    </>
  )
}
