import { useEffect, useState } from 'react'
import { MessageSquareWarning, MapPin, Calendar } from 'lucide-react'
import { fetchComplaintsBySociety, updateComplaintStatus, type ComplaintWithResident } from '@/shared/services/complaintService'
import { useAuthStore } from '@/shared/stores/authStore'
import { cn } from '@/shared/utils/cn'
import type { ComplaintStatus } from '@/shared/types'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'

const STATUS_OPTIONS: { label: string; value: ComplaintStatus }[] = [
  { label: 'Open',        value: 'open'        },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved',    value: 'resolved'    },
  { label: 'Closed',      value: 'closed'      },
]

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  open:        'badge-danger',
  in_progress: 'badge-pending',
  resolved:    'badge-success',
  closed:      'bg-gray-100 text-gray-600 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
}

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  open:        'Open',
  in_progress: 'In Progress',
  resolved:    'Resolved',
  closed:      'Closed',
}

export default function ComplaintsPage() {
  const societyId = useAuthStore((s) => s.user?.society_id)
  const [complaints, setComplaints] = useState<ComplaintWithResident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!societyId) { setIsLoading(false); return }
    fetchComplaintsBySociety(societyId)
      .then(setComplaints)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [societyId])

  async function handleStatus(id: string, status: ComplaintStatus) {
    setUpdatingId(id)
    try {
      await updateComplaintStatus(id, status)
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-800">Complaints</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">{complaints.length} total</p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {isLoading ? <LoadingSpinner /> : complaints.length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title="No complaints yet" description="Resident complaints will appear here." />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-heading font-semibold text-gray-800">{c.title}</h3>
                <span className={STATUS_STYLES[c.status]}>{STATUS_LABELS[c.status]}</span>
              </div>
              <p className="font-body text-sm text-gray-600 mb-3">{c.description}</p>

              <div className="flex items-center gap-3 text-xs text-gray-400 font-body flex-wrap mb-3">
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {c.resident.block ? `${c.resident.block}-` : ''}{c.resident.flat_no}
                </span>
                <span>•</span>
                <span>{c.resident.user.name ?? c.resident.user.mobile}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              {/* Status pills */}
              <div className="flex gap-1.5 flex-wrap pt-3 border-t border-gray-100">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatus(c.id, opt.value)}
                    disabled={c.status === opt.value || updatingId === c.id}
                    className={cn(
                      'text-xs font-semibold font-body px-2.5 py-1 rounded-full transition-colors',
                      c.status === opt.value
                        ? 'bg-primary text-white cursor-default'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
