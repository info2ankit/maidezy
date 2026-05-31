import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import { House, CalendarCheck, User, ChatCircleDots, ShieldStar } from '@phosphor-icons/react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { SPRING, SPRING_SNAPPY } from '@/shared/utils/motion'
import { useAuthStore } from '@/shared/stores/authStore'
import { useResidentStore } from './stores/residentStore'
import { fetchResidentProfile, fetchResidentBookings } from './services/residentPortalService'
import LoadingSpinner from '@/shared/components/LoadingSpinner'

const OnboardingScreen        = lazy(() => import('./screens/OnboardingScreen'))
const ResidentHomePage        = lazy(() => import('./pages/ResidentHomePage'))
const ResidentBookingsPage    = lazy(() => import('./pages/ResidentBookingsPage'))
const ResidentComplaintsPage  = lazy(() => import('./pages/ResidentComplaintsPage'))
const ResidentProfilePage     = lazy(() => import('./pages/ResidentProfilePage'))

function PageRoutes() {
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
          <Route index             element={<Navigate to="home" replace />} />
          <Route path="home"       element={<ResidentHomePage />} />
          <Route path="browse"     element={<Navigate to="/resident/home" replace />} />
          <Route path="bookings"   element={<ResidentBookingsPage />} />
          <Route path="complaints" element={<ResidentComplaintsPage />} />
          <Route path="profile"    element={<ResidentProfilePage />} />
          <Route path="*"          element={<Navigate to="home" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function ResidentLayout() {
  const { user }                                       = useAuthStore()
  const { resident, setResident, pendingCount, setPendingCount } = useResidentStore()
  const [checking, setChecking]                        = useState(true)

  useEffect(() => {
    async function check() {
      if (!user?.id) { setChecking(false); return }
      try {
        const r = await fetchResidentProfile(user.id)
        if (r) setResident(r)
      } catch (e) {
        console.error('Failed to load resident', e)
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [user?.id, setResident])

  useEffect(() => {
    async function loadCount() {
      if (!resident?.id) return
      try {
        const bookings = await fetchResidentBookings(resident.id)
        setPendingCount(bookings.filter((b) => b.status === 'pending').length)
      } catch (e) {
        console.error('Failed to load pending booking count', e)
      }
    }
    loadCount()
  }, [resident?.id, setPendingCount])

  async function handleOnboardingComplete() {
    if (!user?.id) return
    const r = await fetchResidentProfile(user.id)
    if (r) setResident(r)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <LoadingSpinner />
      </div>
    )
  }

  if (!resident) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg">
          <LoadingSpinner />
        </div>
      }>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto pb-20 min-h-screen bg-white shadow-sm">
        <Suspense fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <LoadingSpinner />
          </div>
        }>
          <PageRoutes />
        </Suspense>
      </div>

      <BottomNav pendingCount={pendingCount} />
    </div>
  )
}

function BottomNav({ pendingCount }: { pendingCount: number }) {
  const { pathname } = useLocation()
  const isRwaAdmin = useAuthStore((s) => s.isRwaAdmin)

  const tabs = [
    { to: '/resident/home',       icon: House,           label: 'Home',       badge: 0 },
    { to: '/resident/bookings',   icon: CalendarCheck,   label: 'Bookings',   badge: pendingCount },
    { to: '/resident/complaints', icon: ChatCircleDots,  label: 'Complaints', badge: 0 },
    ...(isRwaAdmin
      ? [{ to: '/rwa-admin/dashboard', icon: ShieldStar, label: 'Admin', badge: 0 }]
      : []),
    { to: '/resident/profile',    icon: User,            label: 'Profile',    badge: 0 },
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] z-40">
      <div className="max-w-lg mx-auto h-16 flex items-center justify-around px-2">
        <LayoutGroup id="resident-bottom-nav">
          {tabs.map((tab) => {
            const Icon   = tab.icon
            const active = pathname.startsWith(tab.to)

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[64px]"
              >
                {active && (
                  <motion.span
                    layoutId="resident-nav-pill"
                    className="absolute top-0 inset-x-3 h-[3px] bg-primary rounded-full"
                    transition={SPRING_SNAPPY}
                  />
                )}
                <div className="relative">
                  <motion.div
                    animate={{ scale: active ? 1.18 : 1, y: active ? -1 : 0 }}
                    transition={SPRING}
                  >
                    <Icon
                      size={22}
                      weight={active ? 'fill' : 'regular'}
                      className={active ? 'text-primary' : 'text-gray-400'}
                    />
                  </motion.div>
                  {tab.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={SPRING}
                      className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                    >
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </motion.span>
                  )}
                </div>
                <span className={[
                  'text-[10px] font-body font-semibold transition-colors',
                  active ? 'text-primary' : 'text-gray-400',
                ].join(' ')}>
                  {tab.label}
                </span>
              </NavLink>
            )
          })}
        </LayoutGroup>
      </div>
    </nav>
  )
}
