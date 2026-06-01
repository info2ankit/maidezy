import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Buildings, Users, ClipboardText, CheckCircle, XCircle,
  HourglassMedium, MinusCircle,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/shared/stores/authStore'
import { fetchWorkerAdminMeta, fetchWorkersForAdmin, computeStats } from '../services/workerAdminService'
import type { WaDashboardStats } from '../services/workerAdminService'
import { fetchSocieties } from '@/shared/services/societyService'
import type { Society } from '@/shared/types'
import LoadingSpinner from '@/shared/components/LoadingSpinner'

interface StatCardProps {
  label: string
  value: number
  color: string
  bg:    string
  icon:  React.ReactNode
}

function StatCard({ label, value, color, bg, icon }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className={`font-heading text-2xl font-bold ${color}`}>{value}</p>
        <p className="font-body text-sm text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function WaDashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats]         = useState<WaDashboardStats | null>(null)
  const [societies, setSocieties] = useState<Society[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      try {
        const adminMeta = await fetchWorkerAdminMeta(user!.id)
        const ids       = adminMeta?.society_ids ?? []

        const [workers, allSocieties] = await Promise.all([
          fetchWorkersForAdmin(ids),
          fetchSocieties(),
        ])

        setStats(computeStats(workers, ids))
        setSocieties(allSocieties.filter((s) => ids.includes(s.id)))
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user?.id])

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 text-sm font-body text-danger-dark">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="font-heading text-xl font-bold text-gray-800">
          Welcome{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">
          Here's an overview of your assigned societies and workers.
        </p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Active Workers"
          value={stats?.total ?? 0}
          color="text-primary"
          bg="bg-primary/10"
          icon={<Users size={22} weight="duotone" className="text-primary" />}
        />
        <StatCard
          label="Awaiting Review"
          value={stats?.submitted ?? 0}
          color="text-yellow-600"
          bg="bg-yellow-50"
          icon={<HourglassMedium size={22} weight="duotone" className="text-yellow-500" />}
        />
        <StatCard
          label="KYC Approved"
          value={stats?.approved ?? 0}
          color="text-success-dark"
          bg="bg-success-light"
          icon={<CheckCircle size={22} weight="duotone" className="text-success" />}
        />
        <StatCard
          label="KYC Rejected"
          value={stats?.rejected ?? 0}
          color="text-danger-dark"
          bg="bg-danger-light"
          icon={<XCircle size={22} weight="duotone" className="text-danger" />}
        />
      </div>

      {/* Removed workers callout (only when relevant) */}
      {(stats?.removed ?? 0) > 0 && (
        <Link
          to="/worker-admin/workers"
          className="card flex items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
            <MinusCircle size={20} weight="duotone" className="text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-gray-800">
              {stats!.removed} worker{stats!.removed !== 1 ? 's' : ''} removed from your societies
            </p>
            <p className="font-body text-xs text-gray-400 mt-0.5">
              Tap to review or restore them in the Workers tab.
            </p>
          </div>
        </Link>
      )}

      {/* Assigned societies */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Buildings size={16} weight="duotone" className="text-primary" />
          <h2 className="font-heading text-base font-bold text-gray-800">Your Societies</h2>
          <span className="badge-success">{societies.length}</span>
        </div>

        {societies.length === 0 ? (
          <div className="card text-center py-8">
            <Buildings size={32} weight="duotone" className="text-gray-300 mx-auto mb-2" />
            <p className="font-body text-sm text-gray-400">No societies assigned yet.</p>
            <p className="font-body text-xs text-gray-300 mt-1">Contact your Super Admin.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {societies.map((s) => (
              <div key={s.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Buildings size={18} weight="duotone" className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-body font-semibold text-gray-800 truncate">{s.name}</p>
                  <p className="font-body text-xs text-gray-400">{s.city}, {s.state}</p>
                </div>
                <span className={s.status === 'active' ? 'badge-success ml-auto' : 'badge-danger ml-auto'}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending KYC nudge */}
      {(stats?.submitted ?? 0) > 0 && (
        <Link
          to="/worker-admin/kyc"
          className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-yellow-100/70 transition-colors"
        >
          <HourglassMedium size={20} weight="duotone" className="text-yellow-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-gray-800">
              {stats!.submitted} worker{stats!.submitted !== 1 ? 's' : ''} waiting for KYC review
            </p>
            <p className="font-body text-xs text-gray-500 mt-0.5">Go to KYC Reviews to approve or reject.</p>
          </div>
          <ClipboardText size={18} weight="duotone" className="text-yellow-500 shrink-0" />
        </Link>
      )}
    </div>
  )
}
