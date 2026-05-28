import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import { House, CalendarCheck, User } from '@phosphor-icons/react'
import { useAuthStore } from '@/shared/stores/authStore'
import { useResidentStore } from './stores/residentStore'
import { fetchResidentProfile, fetchResidentBookings } from './services/residentPortalService'
import LoadingSpinner from '@/shared/components/LoadingSpinner'

const OnboardingScreen      = lazy(() => import('./screens/OnboardingScreen'))
const ResidentHomePage      = lazy(() => import('./pages/ResidentHomePage'))
const ResidentBookingsPage  = lazy(() => import('./pages/ResidentBookingsPage'))
const ResidentProfilePage   = lazy(() => import('./pages/ResidentProfilePage'))

export default function ResidentLayout() {
  const { user }                       = useAuthStore()
  const { resident, setResident }      = useResidentStore()
  const [checking, setChecking]        = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

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
      } catch { /* ignore */ }
    }
    loadCount()
  }, [resident?.id])

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
          <Routes>
            <Route index           element={<Navigate to="home" replace />} />
            <Route path="home"     element={<ResidentHomePage />} />
            <Route path="browse"   element={<Navigate to="/resident/home" replace />} />
            <Route path="bookings" element={<ResidentBookingsPage />} />
            <Route path="profile"  element={<ResidentProfilePage />} />
            <Route path="*"        element={<Navigate to="home" replace />} />
          </Routes>
        </Suspense>
      </div>

      <BottomNav pendingCount={pendingCount} />
    </div>
  )
}

function BottomNav({ pendingCount }: { pendingCount: number }) {
  const { pathname } = useLocation()

  const tabs = [
    { to: '/resident/home',     icon: House,        label: 'Home',     badge: 0 },
    { to: '/resident/bookings', icon: CalendarCheck, label: 'Bookings', badge: pendingCount },
    { to: '/resident/profile',  icon: User,         label: 'Profile',  badge: 0 },
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] z-40">
      <div className="max-w-lg mx-auto h-16 flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon   = tab.icon
          const active = pathname.startsWith(tab.to)

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="relative flex flex-col items-center gap-0.5 py-2 px-3 transition-colors min-w-[64px]"
            >
              <div className="relative">
                <Icon
                  size={22}
                  weight={active ? 'fill' : 'regular'}
                  className={active ? 'text-primary' : 'text-gray-400'}
                />
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={[
                'text-[10px] font-body font-semibold',
                active ? 'text-primary' : 'text-gray-400',
              ].join(' ')}>
                {tab.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
