import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Phone, GenderIntersex, MapPin, Buildings, Clock,
  IdentificationCard, ArrowSquareOut, UserCircle, SpinnerGap,
  MinusCircle, ArrowCounterClockwise, ClockCounterClockwise, ShieldWarning,
} from '@phosphor-icons/react'
import { backdropVariants, SPRING } from '@/shared/utils/motion'
import KycBadge from '@/shared/components/KycBadge'
import type { Society } from '@/shared/types'
import type { WorkerForAdmin, WorkerActionLogEntry } from '../services/workerAdminService'
import { fetchWorkerActions } from '../services/workerAdminService'

const sheetVariants = {
  hidden: { y: '100%' },
  show:   { y: 0,      transition: { type: 'spring' as const, stiffness: 360, damping: 36 } },
  exit:   { y: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
}

const GENDER_LABEL: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other',
}

interface Props {
  worker:          WorkerForAdmin
  /** Societies the admin manages — used to scope per-society controls and history. */
  adminSocieties:  Society[]
  onRequestRemove:  (worker: WorkerForAdmin, society: Society) => void
  onRequestRestore: (worker: WorkerForAdmin, society: Society) => void
  onClose: () => void
}

type SocietyMembershipState = 'active' | 'removed' | 'not_assigned'

interface SocietyRow {
  society: Society
  state:   SocietyMembershipState
}

export default function WorkerDetailSheet({
  worker, adminSocieties, onRequestRemove, onRequestRestore, onClose,
}: Props) {
  const [open, setOpen]         = useState(true)
  const [history, setHistory]   = useState<WorkerActionLogEntry[] | null>(null)
  const [historyErr, setHistoryErr] = useState<string | null>(null)
  const [photoOpen, setPhotoOpen]   = useState(false)

  useEffect(() => {
    const ids = adminSocieties.map((s) => s.id)
    fetchWorkerActions(worker.user_id, ids)
      .then(setHistory)
      .catch((e) => setHistoryErr((e as Error).message))
  }, [worker.user_id, adminSocieties])

  const rows: SocietyRow[] = adminSocieties.map((s) => {
    if (worker.society_ids.includes(s.id))         return { society: s, state: 'active' }
    if (worker.removed_society_ids.includes(s.id)) return { society: s, state: 'removed' }
    return { society: s, state: 'not_assigned' }
  })

  const adminMap = new Map(adminSocieties.map((s) => [s.id, s]))

  const activeHere   = rows.filter((r) => r.state === 'active').length
  const removedHere  = rows.filter((r) => r.state === 'removed').length

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="wd-backdrop"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden" animate="show" exit="exit"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={onClose}>
        {open && (
          <motion.div
            key="wd-sheet"
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            variants={sheetVariants}
            initial="hidden" animate="show" exit="exit"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0 bg-bg">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header — photo + name */}
            <div className="px-5 pt-2 pb-4 shrink-0 bg-white border-b border-gray-100">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => worker.photo_url && setPhotoOpen(true)}
                  className={[
                    'w-16 h-16 rounded-2xl shrink-0 overflow-hidden border-2 border-primary/20',
                    worker.photo_url ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'bg-primary/10 flex items-center justify-center',
                  ].join(' ')}
                  title={worker.photo_url ? 'View photo' : undefined}
                >
                  {worker.photo_url ? (
                    <img src={worker.photo_url} alt={worker.name ?? 'Worker'} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle size={32} weight="duotone" className="text-primary" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="font-heading font-bold text-gray-900 text-lg leading-tight truncate">
                    {worker.name ?? 'Unnamed worker'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    <KycBadge status={worker.kyc_status} />
                    {!worker.is_active && (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                        <ShieldWarning size={10} weight="bold" />
                        Globally inactive
                      </span>
                    )}
                  </div>
                </div>

                <motion.button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0"
                  whileTap={{ scale: 0.88, rotate: 90 }}
                  transition={SPRING}
                >
                  <X size={16} weight="bold" className="text-gray-500" />
                </motion.button>
              </div>

              {/* Quick facts strip */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <a
                  href={`tel:+91${worker.mobile}`}
                  className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 rounded-xl px-3 py-2 transition-colors"
                >
                  <Phone size={13} weight="duotone" className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-body text-[10px] text-gray-400 uppercase tracking-wide">Mobile</p>
                    <p className="font-body text-sm font-semibold text-gray-700 truncate">+91 {worker.mobile}</p>
                  </div>
                </a>
                {worker.gender && (
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <GenderIntersex size={13} weight="duotone" className="text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-body text-[10px] text-gray-400 uppercase tracking-wide">Gender</p>
                      <p className="font-body text-sm font-semibold text-gray-700 truncate">
                        {GENDER_LABEL[worker.gender] ?? worker.gender}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {worker.address && (
                <div className="flex items-start gap-2 mt-2 px-1">
                  <MapPin size={13} weight="duotone" className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="font-body text-xs text-gray-500 line-clamp-2">{worker.address}</p>
                </div>
              )}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {/* ── Aadhaar shortcut ── */}
              {worker.aadhaar_url && (
                <a
                  href={worker.aadhaar_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <IdentificationCard size={16} weight="duotone" className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-gray-800">Aadhaar Card</p>
                    <p className="font-body text-xs text-gray-400">Tap to view in a new tab</p>
                  </div>
                  <ArrowSquareOut size={14} weight="bold" className="text-gray-400 shrink-0" />
                </a>
              )}

              {/* ── Per-society controls ── */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Your Societies ({adminSocieties.length})
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] font-body font-bold uppercase tracking-wide">
                    <span className="text-success-dark">{activeHere} active</span>
                    {removedHere > 0 && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-danger-dark">{removedHere} removed</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {rows.map(({ society, state }) => (
                    <SocietyControlRow
                      key={society.id}
                      society={society}
                      state={state}
                      onRemove={() => onRequestRemove(worker, society)}
                      onRestore={() => onRequestRestore(worker, society)}
                    />
                  ))}
                </div>
              </div>

              {/* ── Other (out-of-scope) societies the worker serves ── */}
              {(() => {
                const otherActive = worker.society_ids.filter((id) => !adminMap.has(id))
                if (otherActive.length === 0) return null
                return (
                  <div className="card space-y-2">
                    <div className="flex items-center gap-2">
                      <Buildings size={13} weight="duotone" className="text-gray-400" />
                      <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Also serves
                      </p>
                    </div>
                    <p className="font-body text-xs text-gray-500">
                      This worker is active in <span className="font-semibold text-gray-700">{otherActive.length}</span> other societ{otherActive.length === 1 ? 'y' : 'ies'} you don't manage.
                      Removing them from your society won't affect their other assignments.
                    </p>
                  </div>
                )
              })()}

              {/* ── History ── */}
              <div className="card space-y-3">
                <div className="flex items-center gap-2">
                  <ClockCounterClockwise size={14} weight="duotone" className="text-gray-400" />
                  <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Activity
                  </p>
                </div>

                {historyErr ? (
                  <p className="font-body text-xs text-danger-dark">{historyErr}</p>
                ) : history === null ? (
                  <div className="flex justify-center py-3">
                    <SpinnerGap size={16} weight="bold" className="animate-spin text-gray-400" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="font-body text-xs text-gray-400 italic">
                    No actions yet. Removal or restoration events will show here.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {history.map((entry) => (
                      <HistoryRow key={entry.id} entry={entry} societyMap={adminMap} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo lightbox */}
      <AnimatePresence>
        {photoOpen && worker.photo_url && (
          <motion.div
            key="wd-photo"
            className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPhotoOpen(false)}
          >
            <button
              type="button"
              onClick={() => setPhotoOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={18} weight="bold" className="text-white" />
            </button>
            <img
              src={worker.photo_url}
              alt="Worker photo"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SocietyControlRow({
  society, state, onRemove, onRestore,
}: {
  society: Society
  state:   SocietyMembershipState
  onRemove:  () => void
  onRestore: () => void
}) {
  const styles = {
    active: {
      wrap: 'bg-success-light border-success/20',
      iconBg: 'bg-success/15',
      icon: 'text-success-dark',
      badge: 'bg-success text-white',
      label: 'Active',
      actionLabel: 'Remove',
      actionIcon: <MinusCircle size={12} weight="bold" />,
      actionClass: 'text-danger-dark hover:bg-danger/10',
      onAction: onRemove,
    },
    removed: {
      wrap: 'bg-danger-light border-danger/15',
      iconBg: 'bg-danger/15',
      icon: 'text-danger-dark',
      badge: 'bg-danger/15 text-danger-dark',
      label: 'Removed',
      actionLabel: 'Restore',
      actionIcon: <ArrowCounterClockwise size={12} weight="bold" />,
      actionClass: 'text-success-dark hover:bg-success/10',
      onAction: onRestore,
    },
    not_assigned: {
      wrap: 'bg-gray-50 border-gray-100',
      iconBg: 'bg-gray-200',
      icon: 'text-gray-400',
      badge: 'bg-gray-200 text-gray-500',
      label: 'Not assigned',
      actionLabel: 'Assign',
      actionIcon: <ArrowCounterClockwise size={12} weight="bold" />,
      actionClass: 'text-primary hover:bg-primary/10',
      onAction: onRestore,
    },
  }[state]

  return (
    <div className={`rounded-2xl border overflow-hidden ${styles.wrap}`}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}>
          <Buildings size={15} weight="duotone" className={styles.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-semibold text-gray-800 truncate">{society.name}</p>
          <p className="font-body text-xs text-gray-400 truncate">{society.city}, {society.state}</p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${styles.badge}`}>
          {styles.label}
        </span>
      </div>
      <button
        type="button"
        onClick={styles.onAction}
        className={`w-full border-t border-white/40 px-3 py-1.5 flex items-center justify-center gap-1.5 font-body text-xs font-bold transition-colors ${styles.actionClass}`}
      >
        {styles.actionIcon}
        {styles.actionLabel}
      </button>
    </div>
  )
}

function HistoryRow({
  entry, societyMap,
}: {
  entry: WorkerActionLogEntry
  societyMap: Map<string, Society>
}) {
  const society = societyMap.get(entry.society_id)
  const isRemove = entry.action === 'removed'
  const when = new Date(entry.created_at)
  const dateLabel = when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeLabel = when.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isRemove ? 'bg-danger/10' : 'bg-success/10'
      }`}>
        {isRemove
          ? <MinusCircle size={13} weight="duotone" className="text-danger" />
          : <ArrowCounterClockwise size={13} weight="duotone" className="text-success" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm text-gray-800 leading-snug">
          <span className="font-semibold">
            {isRemove ? 'Removed from' : 'Restored to'} {society?.name ?? 'a society'}
          </span>
          {entry.admin_name && (
            <span className="text-gray-500"> by {entry.admin_name}</span>
          )}
        </p>
        {entry.reason && (
          <p className="font-body text-xs text-gray-500 italic mt-0.5 line-clamp-2">
            "{entry.reason}"
          </p>
        )}
        <p className="font-body text-[10px] text-gray-400 mt-1 flex items-center gap-1">
          <Clock size={9} weight="duotone" />
          {dateLabel} · {timeLabel}
        </p>
      </div>
    </div>
  )
}
