import { useEffect, useState } from 'react'
import {
  ClipboardText, Phone, CheckCircle, XCircle,
  SpinnerGap, IdentificationCard, ArrowSquareOut, X,
  GenderIntersex, MapPin, UserCircle,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/shared/stores/authStore'
import {
  fetchWorkerAdminMeta, fetchWorkersForAdmin, reviewWorkerKyc,
} from '../services/workerAdminService'
import type { WorkerForAdmin } from '../services/workerAdminService'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import RichTextEditor from '@/shared/components/RichTextEditor'

type ReviewAction = 'approved' | 'rejected'
type PendingReview = { worker: WorkerForAdmin; action: ReviewAction } | null
type ReviewingState = { id: string; action: ReviewAction } | null

const GENDER_LABEL: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other',
}

export default function WaKycPage() {
  const { user } = useAuthStore()
  const [workers, setWorkers]           = useState<WorkerForAdmin[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [pendingReview, setPendingReview]     = useState<PendingReview>(null)
  const [rejectionNotes, setRejectionNotes]   = useState('')
  const [reviewing, setReviewing]             = useState<ReviewingState>(null)
  const [photoPreview, setPhotoPreview]       = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      try {
        const meta = await fetchWorkerAdminMeta(user!.id)
        const all  = await fetchWorkersForAdmin(meta?.society_ids ?? [])
        setWorkers(all.filter((w) => w.kyc_status === 'submitted'))
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user?.id])

  async function confirmReview() {
    if (!user?.id || !pendingReview) return
    const { worker, action } = pendingReview
    setReviewing({ id: worker.user_id, action })
    setPendingReview(null)
    try {
      await reviewWorkerKyc(worker.user_id, action, user.id, action === 'rejected' ? rejectionNotes : undefined)
      setWorkers((prev) => prev.filter((w) => w.user_id !== worker.user_id))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setReviewing(null)
      setRejectionNotes('')
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-800">KYC Reviews</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">
          {workers.length === 0
            ? 'All caught up!'
            : `${workers.length} worker${workers.length !== 1 ? 's' : ''} awaiting review`}
        </p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {workers.length === 0 ? (
        <EmptyState
          icon={ClipboardText}
          title="No pending KYC reviews"
          description="Workers who upload their Aadhaar and photo will appear here for your review."
        />
      ) : (
        <div className="space-y-4">
          {workers.map((worker) => {
            const isProcessing = reviewing?.id === worker.user_id
            return (
              <div key={worker.user_id} className="card space-y-4">

                {/* Photo + name header */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => worker.photo_url && setPhotoPreview(worker.photo_url)}
                    className={[
                      'w-14 h-14 rounded-full shrink-0 overflow-hidden border-2 border-primary/20',
                      worker.photo_url ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'bg-primary/10 flex items-center justify-center',
                    ].join(' ')}
                    title={worker.photo_url ? 'View photo' : undefined}
                  >
                    {worker.photo_url ? (
                      <img src={worker.photo_url} alt={worker.name ?? 'Worker'} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle size={28} weight="duotone" className="text-primary" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="font-body font-bold text-gray-800 text-base truncate">
                      {worker.name ?? 'Unnamed Worker'}
                    </p>
                    <span className="flex items-center gap-1 text-xs text-gray-400 font-body mt-0.5">
                      <Phone size={11} weight="duotone" />
                      {worker.mobile}
                    </span>
                  </div>

                  <span className="badge-pending shrink-0">Under Review</span>
                </div>

                {/* Gender + address */}
                {(worker.gender || worker.address) && (
                  <div className="space-y-1.5">
                    {worker.gender && (
                      <div className="flex items-center gap-2 text-xs font-body text-gray-500">
                        <GenderIntersex size={13} weight="duotone" className="text-gray-400 shrink-0" />
                        <span className="font-semibold capitalize text-gray-700">{GENDER_LABEL[worker.gender] ?? worker.gender}</span>
                      </div>
                    )}
                    {worker.address && (
                      <div className="flex items-start gap-2 text-xs font-body text-gray-500">
                        <MapPin size={13} weight="duotone" className="text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{worker.address}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Aadhaar link */}
                <div>
                  {worker.aadhaar_url ? (
                    <a
                      href={worker.aadhaar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary font-body text-sm font-semibold hover:bg-primary/10 transition-colors"
                    >
                      <IdentificationCard size={16} weight="duotone" />
                      View Aadhaar Card
                      <ArrowSquareOut size={13} weight="bold" className="opacity-60" />
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-200 text-gray-400 font-body text-sm">
                      <IdentificationCard size={16} weight="duotone" />
                      Aadhaar not uploaded
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingReview({ worker, action: 'rejected' })}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-danger/30 bg-danger-light text-danger-dark font-body font-semibold text-sm hover:bg-danger/10 transition-colors disabled:opacity-50"
                  >
                    {isProcessing && reviewing?.action === 'rejected'
                      ? <SpinnerGap size={15} weight="bold" className="animate-spin" />
                      : <XCircle size={16} weight="fill" />}
                    Reject
                  </button>
                  <button
                    onClick={() => setPendingReview({ worker, action: 'approved' })}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-success/30 bg-success-light text-success-dark font-body font-semibold text-sm hover:bg-success/10 transition-colors disabled:opacity-50"
                  >
                    {isProcessing && reviewing?.action === 'approved'
                      ? <SpinnerGap size={15} weight="bold" className="animate-spin" />
                      : <CheckCircle size={16} weight="fill" />}
                    Approve
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm review dialog */}
      {pendingReview && (
        <ConfirmDialog
          title={pendingReview.action === 'approved' ? 'Approve KYC?' : 'Reject KYC?'}
          message={
            pendingReview.action === 'approved'
              ? `Approve KYC for ${pendingReview.worker.name ?? pendingReview.worker.mobile}? This will allow them to accept bookings.`
              : `Add a note explaining why ${pendingReview.worker.name ?? pendingReview.worker.mobile}'s KYC is being rejected. The worker will see this.`
          }
          confirmLabel={pendingReview.action === 'approved' ? 'Yes, Approve' : 'Yes, Reject'}
          variant={pendingReview.action === 'approved' ? 'success' : 'danger'}
          isLoading={reviewing !== null}
          disableConfirm={pendingReview.action === 'rejected' && rejectionNotes.replace(/<[^>]*>/g, '').trim() === ''}
          onConfirm={confirmReview}
          onCancel={() => { setPendingReview(null); setRejectionNotes('') }}
        >
          {pendingReview.action === 'rejected' && (
            <RichTextEditor
              placeholder="e.g. Aadhaar photo is blurry. Please re-upload a clear scan."
              onChange={setRejectionNotes}
              minHeight={110}
            />
          )}
        </ConfirmDialog>
      )}

      {/* Photo lightbox */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <button
            type="button"
            onClick={() => setPhotoPreview(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={18} weight="bold" className="text-white" />
          </button>
          <img
            src={photoPreview}
            alt="Worker photo"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
