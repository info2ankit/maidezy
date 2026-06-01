import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Buildings, MapPin, WarningCircle, SpinnerGap, Check, ArrowCounterClockwise,
} from '@phosphor-icons/react'
import { backdropVariants, SPRING } from '@/shared/utils/motion'
import type { Society } from '@/shared/types'
import type { WorkerForAdmin } from '../services/workerAdminService'

const sheetVariants = {
  hidden: { y: '100%' },
  show:   { y: 0,      transition: { type: 'spring' as const, stiffness: 360, damping: 36 } },
  exit:   { y: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
}

export type ActionMode = 'remove' | 'restore'

interface Props {
  mode:               ActionMode
  worker:             WorkerForAdmin
  /** Societies the admin manages (intersected with worker's relevant set). */
  pickableSocieties:  Society[]
  /** Submit handler. Receives the chosen society id and (for remove) a reason. */
  onConfirm: (society: Society, reason: string) => Promise<void>
  onClose:   () => void
}

export default function WorkerActionSheet({
  mode, worker, pickableSocieties, onConfirm, onClose,
}: Props) {
  const [open, setOpen]     = useState(true)
  const [societyId, setSocietyId] = useState<string>(
    pickableSocieties.length === 1 ? pickableSocieties[0].id : '',
  )
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (pickableSocieties.length === 1) setSocietyId(pickableSocieties[0].id)
  }, [pickableSocieties])

  const society = pickableSocieties.find((s) => s.id === societyId) ?? null

  // Impact preview — what happens after this action
  const stillActiveAfter = (() => {
    if (!society) return worker.society_ids.length
    if (mode === 'remove') return worker.society_ids.filter((id) => id !== society.id).length
    return Array.from(new Set([...worker.society_ids, society.id])).length
  })()

  const canSubmit = !!society && !submitting && (mode === 'restore' || reason.trim().length >= 3)

  async function handleConfirm() {
    if (!society) return
    if (mode === 'remove' && reason.trim().length < 3) {
      setError('Please give a brief reason (3+ characters).')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(society, reason.trim())
      setOpen(false)
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  const isRemove = mode === 'remove'
  const accentRing = isRemove ? 'ring-danger/20'  : 'ring-success/20'
  const accentBg   = isRemove ? 'bg-danger-light' : 'bg-success-light'
  const accentBtn  = isRemove
    ? 'bg-danger text-white hover:bg-danger/90'
    : 'bg-success text-white hover:bg-success/90'

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="wa-action-backdrop"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden" animate="show" exit="exit"
            onClick={() => !submitting && setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={onClose}>
        {open && (
          <motion.div
            key="wa-action-sheet"
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            variants={sheetVariants}
            initial="hidden" animate="show" exit="exit"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-2 pb-3 shrink-0 border-b border-gray-100">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-2xl ${accentBg} flex items-center justify-center shrink-0`}>
                  {isRemove
                    ? <WarningCircle size={18} weight="duotone" className="text-danger" />
                    : <ArrowCounterClockwise size={18} weight="duotone" className="text-success" />}
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading font-bold text-gray-900 text-lg leading-tight">
                    {isRemove ? 'Remove from a society' : 'Restore to a society'}
                  </h2>
                  <p className="font-body text-xs text-gray-500 mt-0.5 truncate">
                    {worker.name ?? 'Unnamed worker'} · {worker.mobile}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={() => !submitting && setOpen(false)}
                disabled={submitting}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 disabled:opacity-50"
                whileTap={{ scale: 0.88, rotate: 90 }}
                transition={SPRING}
              >
                <X size={16} weight="bold" className="text-gray-500" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 bg-danger-light border border-danger/20 rounded-xl px-3 py-2.5">
                  <WarningCircle size={16} weight="duotone" className="text-danger mt-0.5 shrink-0" />
                  <p className="text-sm font-body text-danger-dark">{error}</p>
                </div>
              )}

              {/* Society picker */}
              <div>
                <label className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  {isRemove ? 'Remove from' : 'Restore to'}
                  <span className="text-gray-400 normal-case ml-1.5">
                    ({pickableSocieties.length} {pickableSocieties.length === 1 ? 'option' : 'options'})
                  </span>
                </label>

                {pickableSocieties.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-5 text-center">
                    <p className="font-body text-sm text-gray-500">
                      {isRemove
                        ? 'This worker is not active in any of your societies.'
                        : 'No removed societies to restore.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pickableSocieties.map((s) => {
                      const selected = s.id === societyId
                      return (
                        <motion.button
                          key={s.id}
                          type="button"
                          onClick={() => setSocietyId(s.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors ${
                            selected
                              ? `bg-primary/5 border-primary/30 ring-2 ${accentRing}`
                              : 'bg-gray-50 border-transparent hover:bg-gray-100'
                          }`}
                          whileTap={{ scale: 0.98 }}
                          transition={SPRING}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            selected ? 'bg-primary/15' : 'bg-gray-200'
                          }`}>
                            <Buildings
                              size={16}
                              weight="duotone"
                              className={selected ? 'text-primary' : 'text-gray-500'}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                            <p className="font-body text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} weight="duotone" />
                              {s.city}, {s.state}
                            </p>
                          </div>
                          {selected && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <Check size={11} weight="bold" className="text-white" />
                            </div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Impact preview */}
              {society && (
                <div className={`rounded-2xl border ${
                  isRemove
                    ? stillActiveAfter === 0
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-blue-50 border-blue-200'
                    : 'bg-success-light border-success/20'
                } px-4 py-3`}>
                  <p className="font-body text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    What happens next
                  </p>
                  {isRemove ? (
                    stillActiveAfter === 0 ? (
                      <p className="font-body text-sm text-amber-800 leading-relaxed">
                        <span className="font-bold">{worker.name ?? 'The worker'}</span> will have no assigned societies after this.
                        They will not be able to take new bookings anywhere.
                        Their account stays active so a Super Admin or another society can re-add them later.
                      </p>
                    ) : (
                      <p className="font-body text-sm text-blue-800 leading-relaxed">
                        <span className="font-bold">{worker.name ?? 'The worker'}</span> will no longer
                        accept bookings in <span className="font-bold">{society.name}</span>.
                        They will remain active in <span className="font-bold">{stillActiveAfter}</span> other societ{stillActiveAfter === 1 ? 'y' : 'ies'}.
                      </p>
                    )
                  ) : (
                    <p className="font-body text-sm text-success-dark leading-relaxed">
                      <span className="font-bold">{worker.name ?? 'The worker'}</span> will be able to
                      accept bookings in <span className="font-bold">{society.name}</span> again.
                      They will then be active in <span className="font-bold">{stillActiveAfter}</span> societ{stillActiveAfter === 1 ? 'y' : 'ies'} total.
                    </p>
                  )}
                </div>
              )}

              {/* Reason (only for remove) */}
              {isRemove && (
                <div>
                  <label className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Reason <span className="text-danger normal-case font-normal">· required</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Multiple no-shows reported by residents"
                    rows={3}
                    maxLength={500}
                    className="input-field w-full resize-none"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="font-body text-xs text-gray-400">
                      Logged for audit. The worker sees a generic notification.
                    </p>
                    <span className="font-body text-xs text-gray-300 tabular-nums">{reason.length}/500</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-3 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-body font-semibold text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canSubmit}
                className={`flex-1 py-2.5 rounded-xl font-body font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${accentBtn}`}
              >
                {submitting && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
                {isRemove ? 'Remove worker' : 'Restore worker'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  )
}
