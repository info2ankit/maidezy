import { useEffect, useState } from 'react'
import { ChatCircleDots, Plus, ChatTeardropText } from '@phosphor-icons/react'
import { useResidentStore } from '../stores/residentStore'
import {
  fetchComplaintsByResident,
  createComplaint,
} from '@/shared/services/complaintService'
import type { Complaint, ComplaintStatus } from '@/shared/types'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import ComplaintFormModal from '../components/ComplaintFormModal'

const STATUS_META: Record<ComplaintStatus, { label: string; cls: string }> = {
  open:        { label: 'Open',        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress: { label: 'In progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  resolved:    { label: 'Resolved',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  closed:      { label: 'Closed',      cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

export default function ResidentComplaintsPage() {
  const { resident }                = useResidentStore()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [showForm,   setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    if (!resident?.id) return
    setIsLoading(true)
    try {
      const rows = await fetchComplaintsByResident(resident.id)
      setComplaints(rows)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [resident?.id])

  async function handleSubmit(input: { title: string; description: string }) {
    if (!resident) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await createComplaint({
        residentId:  resident.id,
        societyId:   resident.society_id,
        title:       input.title,
        description: input.description,
      })
      setComplaints((prev) => [created, ...prev])
      setShowForm(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 pt-4">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-800">My Complaints</h1>
          <p className="font-body text-sm text-gray-400 mt-0.5">
            Issues you've raised with your RWA
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="shrink-0 inline-flex items-center gap-1 bg-accent text-white font-body font-semibold text-xs px-3 py-2 rounded-xl hover:bg-accent-600 active:scale-[0.98] transition-all"
        >
          <Plus size={14} weight="bold" />
          New
        </button>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={ChatCircleDots}
          title="No complaints yet"
          description="Use the New button above to raise an issue with your RWA."
        />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => {
            const meta = STATUS_META[c.status]
            return (
              <div key={c.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-body font-semibold text-gray-800 text-sm leading-tight">
                    {c.title}
                  </h3>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-semibold border ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
                <p className="font-body text-xs text-gray-500 leading-snug whitespace-pre-line">
                  {c.description}
                </p>
                <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
                  <ChatTeardropText size={12} weight="duotone" className="text-gray-400" />
                  <span className="font-body text-[11px] text-gray-400">
                    Filed {formatDate(c.created_at)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ComplaintFormModal
          isSubmitting={submitting}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
