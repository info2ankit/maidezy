import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users, Phone, GenderIntersex, MapPin, MagnifyingGlass, FunnelSimple,
  Buildings, MinusCircle, ArrowCounterClockwise, Eye, UserCircle, ShieldWarning,
  CheckCircle, X,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/shared/stores/authStore'
import {
  fetchWorkerAdminMeta, fetchWorkersForAdmin,
  removeWorkerFromSociety, restoreWorkerToSociety,
} from '../services/workerAdminService'
import type { WorkerForAdmin } from '../services/workerAdminService'
import { fetchSocieties } from '@/shared/services/societyService'
import type { Society, KycStatus } from '@/shared/types'
import KycBadge from '@/shared/components/KycBadge'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import WorkerActionSheet, { type ActionMode } from '../components/WorkerActionSheet'
import WorkerDetailSheet from '../components/WorkerDetailSheet'
import { SPRING, staggerContainer, staggerItem } from '@/shared/utils/motion'

type Tab = 'active' | 'removed'

const KYC_FILTERS: { labelKey: string; value: KycStatus | 'all' }[] = [
  { labelKey: 'worker_admin.workers.kyc_all',      value: 'all'       },
  { labelKey: 'worker_admin.workers.kyc_pending',  value: 'pending'   },
  { labelKey: 'worker_admin.workers.kyc_review',   value: 'submitted' },
  { labelKey: 'worker_admin.workers.kyc_approved', value: 'approved'  },
  { labelKey: 'worker_admin.workers.kyc_rejected', value: 'rejected'  },
]

const GENDER_LABEL: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other',
}

// ─── Action sheet target ──────────────────────────────────────────────────────

interface ActionTarget {
  worker:   WorkerForAdmin
  mode:     ActionMode
  /** Constrained set of societies the picker should show. */
  pickable: Society[]
}

export default function WaWorkersPage() {
  const { t } = useTranslation('admin')
  const { user } = useAuthStore()

  const [adminSocieties, setAdminSocieties] = useState<Society[]>([])
  const [workers, setWorkers]               = useState<WorkerForAdmin[]>([])
  const [isLoading, setIsLoading]           = useState(true)
  const [error, setError]                   = useState<string | null>(null)

  // Filters / tabs
  const [tab, setTab]                = useState<Tab>('active')
  const [search, setSearch]          = useState('')
  const [kycFilter, setKycFilter]    = useState<KycStatus | 'all'>('all')
  const [societyFilter, setSocietyFilter] = useState<string>('all')

  // Detail / action sheets
  const [detailWorker, setDetailWorker] = useState<WorkerForAdmin | null>(null)
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null)
  const [toast, setToast]               = useState<string | null>(null)

  // ─── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function load() {
      try {
        const meta = await fetchWorkerAdminMeta(user!.id)
        const ids  = meta?.society_ids ?? []
        const [allSocieties, all] = await Promise.all([
          fetchSocieties(),
          fetchWorkersForAdmin(ids),
        ])
        if (cancelled) return
        const scoped = allSocieties.filter((s) => ids.includes(s.id))
        setAdminSocieties(scoped)
        setWorkers(all)
        // Default society filter if there's only one
        if (scoped.length === 1) setSocietyFilter(scoped[0].id)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  // ─── Derived state ──────────────────────────────────────────────────────────

  const adminSocietyIds = useMemo(() => adminSocieties.map((s) => s.id), [adminSocieties])
  const adminSocietySet = useMemo(() => new Set(adminSocietyIds), [adminSocietyIds])
  const adminSocietyMap = useMemo(() => new Map(adminSocieties.map((s) => [s.id, s])), [adminSocieties])

  /**
   * For each worker we compute their status within the admin's society scope:
   *   - 'active'  if any of the admin's societies is in worker.society_ids
   *   - 'removed' if none of those are active but some are in removed_society_ids
   */
  const scopedWorkers = useMemo(() => {
    return workers.map((w) => {
      const activeIn  = w.society_ids.filter((id) => adminSocietySet.has(id))
      const removedIn = w.removed_society_ids.filter((id) => adminSocietySet.has(id))
      const scope: Tab = activeIn.length > 0 ? 'active' : 'removed'
      return { worker: w, scope, activeIn, removedIn }
    })
  }, [workers, adminSocietySet])

  const counts = useMemo(() => ({
    active:  scopedWorkers.filter((s) => s.scope === 'active').length,
    removed: scopedWorkers.filter((s) => s.scope === 'removed').length,
  }), [scopedWorkers])

  const filtered = useMemo(() => {
    return scopedWorkers.filter(({ worker, scope, activeIn, removedIn }) => {
      if (scope !== tab) return false

      if (societyFilter !== 'all') {
        const relevantIds = tab === 'active' ? activeIn : removedIn
        if (!relevantIds.includes(societyFilter)) return false
      }

      if (kycFilter !== 'all' && worker.kyc_status !== kycFilter) return false

      if (search) {
        const q = search.toLowerCase()
        const matchName   = worker.name?.toLowerCase().includes(q) ?? false
        const matchMobile = worker.mobile.includes(search)
        if (!matchName && !matchMobile) return false
      }
      return true
    })
  }, [scopedWorkers, tab, societyFilter, kycFilter, search])

  // ─── Action handlers ────────────────────────────────────────────────────────

  function openRemove(worker: WorkerForAdmin, presetSociety?: Society) {
    if (!worker) return
    let pickable: Society[]
    if (presetSociety) {
      pickable = [presetSociety]
    } else {
      pickable = adminSocieties.filter((s) => worker.society_ids.includes(s.id))
    }
    if (pickable.length === 0) {
      setError('This worker is not active in any of your societies.')
      return
    }
    setActionTarget({ worker, mode: 'remove', pickable })
  }

  function openRestore(worker: WorkerForAdmin, presetSociety?: Society) {
    if (!worker) return
    let pickable: Society[]
    if (presetSociety) {
      pickable = [presetSociety]
    } else {
      pickable = adminSocieties.filter(
        (s) => worker.removed_society_ids.includes(s.id) || !worker.society_ids.includes(s.id),
      ).filter((s) => !worker.society_ids.includes(s.id))
    }
    if (pickable.length === 0) {
      setError('Nothing to restore — the worker is already active in all your societies.')
      return
    }
    setActionTarget({ worker, mode: 'restore', pickable })
  }

  async function handleActionSubmit(society: Society, reason: string) {
    if (!actionTarget || !user?.id) return
    const { worker, mode } = actionTarget
    const updated = mode === 'remove'
      ? await removeWorkerFromSociety({
          workerId:    worker.user_id,
          societyId:   society.id,
          societyName: society.name,
          adminId:     user.id,
          reason,
        })
      : await restoreWorkerToSociety({
          workerId:    worker.user_id,
          societyId:   society.id,
          societyName: society.name,
          adminId:     user.id,
        })
    setWorkers((prev) => prev.map((w) => w.user_id === updated.user_id ? updated : w))
    setActionTarget(null)
    setDetailWorker((curr) => (curr && curr.user_id === updated.user_id ? updated : curr))
    setToast(
      t(mode === 'remove'
        ? 'worker_admin.workers.toast_removed'
        : 'worker_admin.workers.toast_restored',
      { name: worker.name ?? 'Worker', society: society.name }),
    )
    window.setTimeout(() => setToast(null), 3200)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-gray-800">{t('worker_admin.workers.title')}</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">
          {t(adminSocieties.length === 1 ? 'worker_admin.workers.subtitle_one' : 'worker_admin.workers.subtitle',
            { count: adminSocieties.length, active: counts.active, removed: counts.removed })}
        </p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 text-danger-dark/60 hover:text-danger-dark">
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* No societies at all */}
      {adminSocieties.length === 0 ? (
        <EmptyState
          icon={ShieldWarning}
          title={t('worker_admin.workers.no_society_title')}
          description={t('worker_admin.workers.no_society_sub')}
        />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <TabPill label={t('worker_admin.common.active')}  count={counts.active}  active={tab === 'active'}  onClick={() => setTab('active')} />
            <TabPill label={t('worker_admin.common.removed')} count={counts.removed} active={tab === 'removed'} onClick={() => setTab('removed')} />
          </div>

          {/* Society chips (only if admin has multiple) */}
          {adminSocieties.length > 1 && (
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-0.5">
              <Buildings size={13} weight="duotone" className="text-gray-400 shrink-0" />
              <FilterChip
                label={t('worker_admin.common.all')}
                active={societyFilter === 'all'}
                onClick={() => setSocietyFilter('all')}
              />
              {adminSocieties.map((s) => (
                <FilterChip
                  key={s.id}
                  label={s.name}
                  active={societyFilter === s.id}
                  onClick={() => setSocietyFilter(s.id)}
                />
              ))}
            </div>
          )}

          {/* Search + KYC filter */}
          <div className="space-y-2.5 mb-5">
            <div className="relative">
              <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('worker_admin.workers.search_placeholder')}
                className="input-field pl-9 w-full"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <FunnelSimple size={13} weight="regular" className="text-gray-400 shrink-0" />
              {KYC_FILTERS.map((f) => (
                <FilterChip
                  key={f.value}
                  label={t(f.labelKey)}
                  active={kycFilter === f.value}
                  onClick={() => setKycFilter(f.value)}
                />
              ))}
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={tab === 'active' ? Users : MinusCircle}
              title={
                tab === 'active'
                  ? t(counts.active === 0 ? 'worker_admin.workers.no_active_title' : 'worker_admin.workers.no_results')
                  : t(counts.removed === 0 ? 'worker_admin.workers.no_removed_title' : 'worker_admin.workers.no_results')
              }
              description={
                tab === 'active'
                  ? t(counts.active === 0
                      ? 'worker_admin.workers.no_active_sub'
                      : 'worker_admin.workers.no_results_sub')
                  : t(counts.removed === 0
                      ? 'worker_admin.workers.no_removed_sub'
                      : 'worker_admin.workers.no_results_sub')
              }
            />
          ) : (
            <motion.div
              key={tab}
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              <AnimatePresence>
                {filtered.map(({ worker, activeIn, removedIn }) => (
                  <motion.div
                    key={worker.user_id}
                    layout
                    variants={staggerItem}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  >
                    <WorkerCard
                      tab={tab}
                      worker={worker}
                      activeInScope={activeIn}
                      removedInScope={removedIn}
                      societyMap={adminSocietyMap}
                      onView={() => setDetailWorker(worker)}
                      onRemove={() => openRemove(
                        worker,
                        activeIn.length === 1 ? adminSocietyMap.get(activeIn[0]) ?? undefined : undefined,
                      )}
                      onRestore={() => openRestore(
                        worker,
                        removedIn.length === 1 ? adminSocietyMap.get(removedIn[0]) ?? undefined : undefined,
                      )}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}

      {/* Detail sheet */}
      <AnimatePresence>
        {detailWorker && (
          <WorkerDetailSheet
            worker={detailWorker}
            adminSocieties={adminSocieties}
            onRequestRemove={(w, s) => { setDetailWorker(null); setActionTarget({ worker: w, mode: 'remove',  pickable: [s] }) }}
            onRequestRestore={(w, s) => { setDetailWorker(null); setActionTarget({ worker: w, mode: 'restore', pickable: [s] }) }}
            onClose={() => setDetailWorker(null)}
          />
        )}
      </AnimatePresence>

      {/* Action sheet */}
      <AnimatePresence>
        {actionTarget && (
          <WorkerActionSheet
            mode={actionTarget.mode}
            worker={actionTarget.worker}
            pickableSocieties={actionTarget.pickable}
            onConfirm={handleActionSubmit}
            onClose={() => setActionTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={SPRING}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-body font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 max-w-[90vw]"
          >
            <CheckCircle size={14} weight="fill" className="text-success" />
            <span className="truncate">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabPill({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-full text-sm font-body font-semibold shrink-0 transition-colors flex items-center gap-1.5',
        active ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
      ].join(' ')}
    >
      {label}
      {count > 0 && (
        <span className={[
          'text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center',
          active ? 'bg-white/20' : 'bg-gray-200 text-gray-600',
        ].join(' ')}>
          {count}
        </span>
      )}
    </button>
  )
}

function FilterChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-full text-xs font-body font-semibold shrink-0 transition-colors whitespace-nowrap',
        active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

interface WorkerCardProps {
  tab:             Tab
  worker:          WorkerForAdmin
  activeInScope:   string[]
  removedInScope:  string[]
  societyMap:      Map<string, Society>
  onView:    () => void
  onRemove:  () => void
  onRestore: () => void
}

function WorkerCard({
  tab, worker, activeInScope, removedInScope, societyMap, onView, onRemove, onRestore,
}: WorkerCardProps) {
  const { t } = useTranslation('admin')
  const otherActiveCount = worker.society_ids.filter((id) => !societyMap.has(id)).length

  return (
    <div className="card overflow-hidden">
      {/* Top: avatar + name + KYC */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onView}
          className="w-12 h-12 rounded-full shrink-0 overflow-hidden border-2 border-primary/10 hover:border-primary/30 transition-colors"
        >
          {worker.photo_url ? (
            <img src={worker.photo_url} alt={worker.name ?? 'Worker'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <UserCircle size={26} weight="duotone" className="text-primary" />
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onView}
            className="font-body font-semibold text-gray-800 truncate text-left hover:text-primary transition-colors block w-full"
          >
            {worker.name ?? 'Unnamed Worker'}
          </button>
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

        <KycBadge status={worker.kyc_status} className="shrink-0" />
      </div>

      {/* Society chips for admin's scope */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {tab === 'active'
          ? activeInScope.map((id) => {
              const s = societyMap.get(id)
              return s ? <ScopeChip key={id} label={s.name} state="active" /> : null
            })
          : removedInScope.map((id) => {
              const s = societyMap.get(id)
              return s ? <ScopeChip key={id} label={s.name} state="removed" /> : null
            })}
        {otherActiveCount > 0 && (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[11px] font-body font-medium px-2 py-0.5 rounded-full">
            {t(otherActiveCount === 1
              ? 'worker_admin.workers.other_society'
              : 'worker_admin.workers.other_societies', { count: otherActiveCount })}
          </span>
        )}
      </div>

      {/* Address */}
      {worker.address && (
        <div className="flex items-start gap-1.5 mt-2 text-xs font-body text-gray-500">
          <MapPin size={12} weight="duotone" className="mt-0.5 shrink-0 text-gray-400" />
          <span className="line-clamp-1">{worker.address}</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 font-body text-xs font-semibold transition-colors"
        >
          <Eye size={13} weight="duotone" />
          {t('worker_admin.common.view_detail')}
        </button>
        {tab === 'active' ? (
          <button
            type="button"
            onClick={onRemove}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-danger-light text-danger-dark hover:bg-danger/10 font-body text-xs font-semibold transition-colors"
          >
            <MinusCircle size={13} weight="duotone" />
            {t(activeInScope.length > 1
              ? 'worker_admin.workers.remove_pick_label'
              : 'worker_admin.workers.remove_label')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onRestore}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-success-light text-success-dark hover:bg-success/10 font-body text-xs font-semibold transition-colors"
          >
            <ArrowCounterClockwise size={13} weight="duotone" />
            {t(removedInScope.length > 1
              ? 'worker_admin.workers.restore_pick_label'
              : 'worker_admin.workers.restore_label')}
          </button>
        )}
      </div>
    </div>
  )
}

function ScopeChip({ label, state }: { label: string; state: 'active' | 'removed' }) {
  const styles = state === 'active'
    ? 'bg-success-light text-success-dark border border-success/20'
    : 'bg-danger-light text-danger-dark border border-danger/20 line-through decoration-from-font'
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-body font-semibold px-2 py-0.5 rounded-full ${styles}`}>
      <Buildings size={10} weight="fill" />
      {label}
    </span>
  )
}
