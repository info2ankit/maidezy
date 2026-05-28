import { useEffect, useState } from 'react'
import {
  Users, Phone, GenderIntersex, MapPin, MagnifyingGlass, FunnelSimple,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/shared/stores/authStore'
import { fetchWorkerAdminMeta, fetchWorkersForAdmin } from '../services/workerAdminService'
import type { WorkerForAdmin } from '../services/workerAdminService'
import { fetchSocieties } from '@/shared/services/societyService'
import type { Society } from '@/shared/types'
import KycBadge from '@/shared/components/KycBadge'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import type { KycStatus } from '@/shared/types'

const KYC_FILTERS: { label: string; value: KycStatus | 'all' }[] = [
  { label: 'All',       value: 'all'       },
  { label: 'Pending',   value: 'pending'   },
  { label: 'Review',    value: 'submitted' },
  { label: 'Approved',  value: 'approved'  },
  { label: 'Rejected',  value: 'rejected'  },
]

const GENDER_LABEL: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other',
}

export default function WaWorkersPage() {
  const { user } = useAuthStore()
  const [workers, setWorkers]         = useState<WorkerForAdmin[]>([])
  const [societyMap, setSocietyMap]   = useState<Map<string, Society>>(new Map())
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [kycFilter, setKycFilter]     = useState<KycStatus | 'all'>('all')

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      try {
        const meta = await fetchWorkerAdminMeta(user!.id)
        const [all, societies] = await Promise.all([
          fetchWorkersForAdmin(meta?.society_ids ?? []),
          fetchSocieties(),
        ])
        setWorkers(all)
        setSocietyMap(new Map(societies.map((s) => [s.id, s])))
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user?.id])

  const filtered = workers.filter((w) => {
    const matchesSearch =
      !search ||
      (w.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      w.mobile.includes(search)

    const matchesKyc = kycFilter === 'all' || w.kyc_status === kycFilter

    return matchesSearch && matchesKyc
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-gray-800">Workers</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">
          {isLoading ? 'Loading…' : `${filtered.length} of ${workers.length} worker${workers.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {/* Search + filter */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or mobile…"
            className="input-field pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <FunnelSimple size={14} weight="regular" className="text-gray-400 shrink-0" />
          {KYC_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setKycFilter(f.value)}
              className={[
                'px-3 py-1 rounded-full text-xs font-body font-semibold shrink-0 transition-colors',
                kycFilter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={workers.length === 0 ? 'No workers yet' : 'No results'}
          description={
            workers.length === 0
              ? 'Workers from your assigned societies will appear here once they register.'
              : 'Try adjusting the search or filter.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((worker) => (
            <div key={worker.user_id} className="card">
              <div className="flex items-start justify-between gap-3">
                {/* Avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="font-heading font-bold text-primary text-base">
                      {(worker.name ?? worker.mobile).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-body font-semibold text-gray-800 truncate">
                      {worker.name ?? 'Unnamed Worker'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-body mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone size={11} weight="duotone" />
                        {worker.mobile}
                      </span>
                      {worker.gender && (
                        <span className="flex items-center gap-1">
                          <GenderIntersex size={11} weight="duotone" />
                          {GENDER_LABEL[worker.gender] ?? worker.gender}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <KycBadge status={worker.kyc_status} className="shrink-0" />
              </div>

              {/* Address */}
              {worker.address && (
                <div className="flex items-start gap-1.5 mt-2.5 text-xs font-body text-gray-500">
                  <MapPin size={12} weight="duotone" className="mt-0.5 shrink-0 text-gray-400" />
                  <span className="line-clamp-2">{worker.address}</span>
                </div>
              )}

              {/* Societies */}
              {worker.society_ids.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {worker.society_ids.map((sid) => {
                    const s = societyMap.get(sid)
                    return s ? (
                      <span
                        key={sid}
                        className="inline-flex items-center gap-1 bg-primary/8 text-primary text-xs font-body font-medium px-2 py-0.5 rounded-full"
                      >
                        {s.name}
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
