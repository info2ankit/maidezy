import { useEffect, useState } from 'react'
import { Building2, Users, Briefcase, Home } from 'lucide-react'
import StatCard from '../components/StatCard'
import { fetchSuperAdminStats, type DashboardStats } from '@/shared/services/dashboardService'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSuperAdminStats()
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-800">Dashboard</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">Platform overview</p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-6 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Societies"
          value={stats?.societies ?? 0}
          icon={Building2}
          variant="primary"
          subtitle="Registered housing societies"
          isLoading={isLoading}
        />
        <StatCard
          title="RWA Admins"
          value={stats?.rwaAdmins ?? 0}
          icon={Users}
          variant="accent"
          subtitle="Active society managers"
          isLoading={isLoading}
        />
        <StatCard
          title="Service Providers"
          value={stats?.serviceProviders ?? 0}
          icon={Briefcase}
          variant="success"
          subtitle="Maids, cooks, drivers & more"
          isLoading={isLoading}
        />
        <StatCard
          title="Residents"
          value={stats?.residents ?? 0}
          icon={Home}
          variant="purple"
          subtitle="Registered residents"
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
