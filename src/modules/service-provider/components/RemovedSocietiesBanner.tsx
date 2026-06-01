import { useEffect, useState } from 'react'
import { MinusCircle, Buildings, CaretRight } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { SPRING } from '@/shared/utils/motion'
import { supabase } from '@/lib/supabase'
import type { Society } from '@/shared/types'

interface Props {
  removedIds: string[]
  /** How many societies the worker is still active in — drives tone. */
  stillActiveCount: number
}

/**
 * Shown on the worker's own dashboard when they have been removed from one or
 * more societies. Read-only — restoration is the admin's call.
 */
export default function RemovedSocietiesBanner({ removedIds, stillActiveCount }: Props) {
  const [societies, setSocieties] = useState<Society[]>([])
  const [expanded, setExpanded]   = useState(false)

  useEffect(() => {
    if (removedIds.length === 0) { setSocieties([]); return }
    supabase
      .from('societies')
      .select('*')
      .in('id', removedIds)
      .then(({ data }) => setSocieties((data ?? []) as Society[]))
  }, [removedIds])

  if (removedIds.length === 0) return null

  const isOrphaned = stillActiveCount === 0
  const wrap = isOrphaned
    ? 'bg-danger-light border-danger/20'
    : 'bg-amber-50 border-amber-200'
  const iconBg = isOrphaned ? 'bg-danger/15' : 'bg-amber-100'
  const iconColor = isOrphaned ? 'text-danger' : 'text-amber-600'

  return (
    <motion.div
      layout
      className={`mb-4 rounded-2xl border ${wrap} overflow-hidden`}
      transition={SPRING}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3.5 text-left"
      >
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <MinusCircle size={18} weight="duotone" className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body font-semibold text-gray-800 text-sm">
            {isOrphaned
              ? 'You have no active societies'
              : `Removed from ${removedIds.length} societ${removedIds.length === 1 ? 'y' : 'ies'}`}
          </p>
          <p className="font-body text-xs text-gray-500 mt-0.5">
            {isOrphaned
              ? 'You cannot accept new bookings. Contact your admin.'
              : `You can still serve ${stillActiveCount} other societ${stillActiveCount === 1 ? 'y' : 'ies'}. Tap to see details.`}
          </p>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={SPRING}
          className="shrink-0"
        >
          <CaretRight size={14} weight="bold" className="text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && societies.length > 0 && (
          <motion.div
            key="removed-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-1.5">
              {societies.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2.5 bg-white/60 rounded-xl px-3 py-2"
                >
                  <Buildings size={13} weight="duotone" className="text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-body text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                    <p className="font-body text-xs text-gray-400">{s.city}, {s.state}</p>
                  </div>
                </div>
              ))}
              <p className="font-body text-[11px] text-gray-500 italic px-1 pt-1 leading-snug">
                Restoration is decided by the society's worker admin. New bookings from
                {' '}these societies will not reach you until then.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
