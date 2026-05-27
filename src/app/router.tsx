import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/shared/stores/authStore'
import type { Role } from '@/shared/types'

// ─── Lazy page imports ────────────────────────────────────────────────────────
import { lazy, Suspense } from 'react'

const LoginPage = lazy(() => import('@/modules/auth/LoginPage'))
const SuperAdminLayout = lazy(() => import('@/modules/super-admin/SuperAdminLayout'))
const RwaAdminLayout = lazy(() => import('@/modules/rwa-admin/RwaAdminLayout'))
const ServiceProviderLayout = lazy(() => import('@/modules/service-provider/ServiceProviderLayout'))
const ResidentLayout = lazy(() => import('@/modules/resident/ResidentLayout'))

// ─── Route guard ──────────────────────────────────────────────────────────────

function RequireRole({ allowed }: { allowed: Role[] }) {
  const { isAuthenticated, role, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />
  }

  if (!allowed.includes(role)) {
    return <Navigate to="/login" replace />
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <Outlet />
    </Suspense>
  )
}

function PublicOnlyRoute() {
  const { isAuthenticated, role } = useAuthStore()

  if (isAuthenticated && role) {
    const redirects: Record<Role, string> = {
      super_admin: '/super-admin',
      rwa_admin: '/rwa-admin',
      service_provider: '/provider',
      resident: '/resident',
    }
    return <Navigate to={redirects[role]} replace />
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <Outlet />
    </Suspense>
  )
}

// ─── Router definition ────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {
    element: <RequireRole allowed={['super_admin']} />,
    children: [
      { path: 'super-admin/*', element: <SuperAdminLayout /> },
    ],
  },
  {
    element: <RequireRole allowed={['rwa_admin']} />,
    children: [
      { path: 'rwa-admin/*', element: <RwaAdminLayout /> },
    ],
  },
  {
    element: <RequireRole allowed={['service_provider']} />,
    children: [
      { path: 'provider/*', element: <ServiceProviderLayout /> },
    ],
  },
  {
    element: <RequireRole allowed={['resident']} />,
    children: [
      { path: 'resident/*', element: <ResidentLayout /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
])
