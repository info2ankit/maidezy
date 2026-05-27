import { useEffect, useState } from 'react'
import { Home, Briefcase, ClipboardCheck, MessageSquareWarning, AlertTriangle } from 'lucide-react'
import StatCard from '@/modules/super-admin/components/StatCard'
import { fetchRwaDashboardStats, type RwaDashboardStats } from '@/shared/services/rwaDashboardService'
import { useAuthStore } from '@/shared/stores/authStore'

export default function RwaDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<RwaDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.society_id) {
      setIsLoading(false)
      return
    }
    fetchRwaDashboardStats(user.society_id)
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [user?.society_id])

  if (!user?.society_id) {
    return (
      <div className="card flex gap-3 items-start">
        <AlertTriangle size={20} className="text-accent shrink-0 mt-0.5" />
        <div>
          <p className="font-body font-semibold text-gray-800">No society assigned</p>
          <p className="font-body text-sm text-gray-500 mt-1">
            Your account isn't linked to a society yet. Ask the Super Admin to assign you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-800">Dashboard</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">Society overview</p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-6 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Residents"        value={stats?.residents ?? 0}      icon={Home}                 variant="primary" isLoading={isLoading} subtitle="Registered in your society" />
        <StatCard title="Service Providers" value={stats?.providers ?? 0}      icon={Briefcase}            variant="accent"  isLoading={isLoading} subtitle="Maids, cooks, drivers"       />
        <StatCard title="Pending KYC"       value={stats?.pendingKyc ?? 0}     icon={ClipboardCheck}       variant="purple"  isLoading={isLoading} subtitle="Awaiting your approval"      />
        <StatCard title="Open Complaints"   value={stats?.openComplaints ?? 0} icon={MessageSquareWarning} variant="success" isLoading={isLoading} subtitle="Needs your attention"        />
      </div>
    </div>
  )
}
