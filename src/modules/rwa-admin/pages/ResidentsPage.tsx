import { useEffect, useState } from 'react'
import { Home, Phone, MapPin } from 'lucide-react'
import { fetchResidentsBySociety, updateResidentKyc, type ResidentWithUser } from '@/shared/services/residentService'
import { useAuthStore } from '@/shared/stores/authStore'
import type { KycStatus } from '@/shared/types'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import KycBadge from '@/shared/components/KycBadge'
import KycActions from '../components/KycActions'

export default function ResidentsPage() {
  const societyId = useAuthStore((s) => s.user?.society_id)
  const [residents, setResidents] = useState<ResidentWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!societyId) { setIsLoading(false); return }
    fetchResidentsBySociety(societyId)
      .then(setResidents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [societyId])

  async function handleKyc(id: string, status: KycStatus) {
    await updateResidentKyc(id, status)
    setResidents((prev) => prev.map((r) => (r.id === id ? { ...r, kyc_status: status } : r)))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-800">Residents</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">{residents.length} registered</p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {isLoading ? <LoadingSpinner /> : residents.length === 0 ? (
        <EmptyState icon={Home} title="No residents yet" description="Residents will appear here once they register." />
      ) : (
        <div className="space-y-3">
          {residents.map((r) => (
            <div key={r.id} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-heading font-bold text-primary">
                    {(r.user.name ?? r.user.mobile).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-body font-semibold text-gray-800 truncate">
                      {r.user.name ?? 'Unnamed Resident'}
                    </p>
                    <KycBadge status={r.kyc_status} />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400 font-body mt-0.5">
                    <span className="flex items-center gap-1"><MapPin size={12} />{r.block ? `${r.block}-` : ''}{r.flat_no}</span>
                    <span className="flex items-center gap-1"><Phone size={12} />{r.user.mobile}</span>
                  </div>
                </div>
              </div>
              <KycActions currentStatus={r.kyc_status} onUpdate={(s) => handleKyc(r.id, s)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
