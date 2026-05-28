import { useEffect, useState } from 'react'
import { Briefcase, Phone, ToggleLeft, ToggleRight, Loader2, Star } from 'lucide-react'
import {
  fetchProvidersBySociety,
  updateProviderKyc,
  toggleProviderAvailability,
  type ProviderRow,
  type ProviderFilters,
} from '@/shared/services/providerService'
import { useAuthStore } from '@/shared/stores/authStore'
import { SERVICE_TYPES, SERVICE_TYPE_BY_ID } from '@/shared/utils/constants'
import { cn } from '@/shared/utils/cn'
import type { KycStatus, ServiceType } from '@/shared/types'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import KycBadge from '@/shared/components/KycBadge'
import KycActions from '../components/KycActions'

const SERVICE_FILTERS: { label: string; value: ServiceType | 'all' }[] = [
  { label: 'All', value: 'all' },
  ...SERVICE_TYPES.map((s) => ({ label: s.label, value: s.id })),
]

const KYC_FILTERS: { label: string; value: KycStatus | 'all' }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Pending',  value: 'pending'  },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

export default function ServicesPage() {
  const societyId = useAuthStore((s) => s.user?.society_id)
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all')
  const [kycFilter, setKycFilter] = useState<KycStatus | 'all'>('all')

  useEffect(() => {
    if (!societyId) { setIsLoading(false); return }
    setIsLoading(true)
    const filters: ProviderFilters = {}
    if (serviceFilter !== 'all') filters.serviceType = serviceFilter
    if (kycFilter !== 'all') filters.kycStatus = kycFilter

    fetchProvidersBySociety(societyId, filters)
      .then(setProviders)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [societyId, serviceFilter, kycFilter])

  async function handleKyc(id: string, status: KycStatus) {
    await updateProviderKyc(id, status)
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, kyc_status: status } : p)))
  }

  async function handleToggle(p: ProviderRow) {
    setTogglingId(p.id)
    try {
      await toggleProviderAvailability(p.id, p.availability)
      setProviders((prev) => prev.map((x) => (x.id === p.id ? { ...x, availability: !x.availability } : x)))
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-gray-800">Service Providers</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">{providers.length} found</p>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {SERVICE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setServiceFilter(f.value)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-body transition-colors',
                serviceFilter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {KYC_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setKycFilter(f.value)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-body transition-colors',
                kycFilter === f.value
                  ? 'bg-accent text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {isLoading ? <LoadingSpinner /> : providers.length === 0 ? (
        <EmptyState icon={Briefcase} title="No providers found" description="Try changing the filters above." />
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="font-heading font-bold text-accent">
                      {(p.user.name ?? p.user.mobile).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-body font-semibold text-gray-800 truncate">
                        {p.user.name ?? 'Unnamed Provider'}
                      </p>
                      <KycBadge status={p.kyc_status} />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400 font-body mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><Phone size={12} />{p.user.mobile}</span>
                      {p.rating > 0 && (
                        <span className="flex items-center gap-1"><Star size={12} className="fill-accent text-accent" />{p.rating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <KycActions currentStatus={p.kyc_status} onUpdate={(s) => handleKyc(p.id, s)} />
              </div>

              {/* Services + rates */}
              {p.services.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {p.services.map((s) => {
                    const def = SERVICE_TYPE_BY_ID[s.service_type]
                    const Icon = def.icon
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <Icon size={13} className="text-accent shrink-0" />
                        <span className="font-heading font-semibold text-gray-800 flex-1 truncate">
                          {def.label}
                        </span>
                        <div className="flex gap-2 font-body text-gray-600 tabular-nums shrink-0">
                          {s.monthly_rate !== null && (
                            <span>₹{s.monthly_rate}<span className="text-gray-400 text-xs">/mo</span></span>
                          )}
                          {s.per_visit_rate !== null && (
                            <span>₹{s.per_visit_rate}<span className="text-gray-400 text-xs">/visit</span></span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Availability toggle row */}
              {p.kyc_status === 'approved' && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm font-body text-gray-500">
                    {p.availability ? 'Available for bookings' : 'Currently unavailable'}
                  </span>
                  <button
                    onClick={() => handleToggle(p)}
                    disabled={togglingId === p.id}
                    className="shrink-0 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {togglingId === p.id ? (
                      <Loader2 size={22} className="animate-spin" />
                    ) : p.availability ? (
                      <ToggleRight size={26} className="text-success" />
                    ) : (
                      <ToggleLeft size={26} />
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
