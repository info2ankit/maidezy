import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Buildings, Users, ClipboardText, CheckCircle, XCircle,
  HourglassMedium, MinusCircle, Fire, CalendarCheck,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/shared/stores/authStore'
import { fetchWorkerAdminMeta, fetchWorkersForAdmin, computeStats } from '../services/workerAdminService'
import type { WaDashboardStats } from '../services/workerAdminService'
import { fetchBookingsForWorkerAdmin, type BookingForWorkerAdmin } from '@/shared/services/bookingService'
import { fetchSocieties } from '@/shared/services/societyService'
import type { Society } from '@/shared/types'
import LoadingSpinner from '@/shared/components/LoadingSpinner'

const CRITICAL_MIN = 60
const AGING_MIN    = 15

interface BookingPulse {
  total:    number
  critical: number
  aging:    number
  oldestMinutes: number
}

function computeBookingPulse(rows: BookingForWorkerAdmin[]): BookingPulse {
  const now = Date.now()
  let total = 0, critical = 0, aging = 0, oldestMs = 0
  for (const b of rows) {
    if (!['pending', 'reschedule_requested'].includes(b.status)) continue
    total++
    const age = now - new Date(b.createdAt).getTime()
    if (age > oldestMs) oldestMs = age
    const min = age / 60_000
    if (min >= CRITICAL_MIN)   critical++
    else if (min >= AGING_MIN) aging++
  }
  return { total, critical, aging, oldestMinutes: Math.floor(oldestMs / 60_000) }
}

interface StatCardProps {
  label: string
  value: number
  color: string
  bg:    string
  icon:  React.ReactNode
}

function StatCard({ label, value, color, bg, icon }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className={`font-heading text-2xl font-bold ${color}`}>{value}</p>
        <p className="font-body text-sm text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function WaDashboardPage() {
  const { t } = useTranslation('admin')
  const { user } = useAuthStore()
  const [stats, setStats]         = useState<WaDashboardStats | null>(null)
  const [pulse, setPulse]         = useState<BookingPulse | null>(null)
  const [societies, setSocieties] = useState<Society[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      try {
        const adminMeta = await fetchWorkerAdminMeta(user!.id)
        const ids       = adminMeta?.society_ids ?? []

        const [workers, allSocieties, bookings] = await Promise.all([
          fetchWorkersForAdmin(ids),
          fetchSocieties(),
          fetchBookingsForWorkerAdmin(user!.id),
        ])

        setStats(computeStats(workers, ids))
        setPulse(computeBookingPulse(bookings))
        setSocieties(allSocieties.filter((s) => ids.includes(s.id)))
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user?.id])

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 text-sm font-body text-danger-dark">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="font-heading text-xl font-bold text-gray-800">
          {t('worker_admin.dashboard.welcome')}{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">
          {t('worker_admin.dashboard.subtitle')}
        </p>
      </div>

      {/* Critical bookings (urgent, pulsing) */}
      {pulse && pulse.critical > 0 && (
        <Link
          to="/worker-admin/bookings"
          className="block bg-gradient-to-r from-danger to-rose-600 text-white rounded-2xl p-4 shadow-md"
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Fire size={22} weight="fill" className="text-white" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-bold text-sm">
                {t(pulse.critical === 1
                  ? 'worker_admin.dashboard.critical_title'
                  : 'worker_admin.dashboard.critical_title_plural', { count: pulse.critical })}
              </p>
              <p className="font-body text-xs text-white/85 mt-0.5">
                {t('worker_admin.dashboard.critical_sub', {
                  age: pulse.oldestMinutes >= 60
                    ? `${Math.floor(pulse.oldestMinutes / 60)}h ${pulse.oldestMinutes % 60}m`
                    : `${pulse.oldestMinutes}m`,
                })}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Aging bookings (amber heads-up, no pulse) */}
      {pulse && pulse.critical === 0 && pulse.aging > 0 && (
        <Link
          to="/worker-admin/bookings"
          className="block bg-amber-50 border border-amber-200 rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
              <CalendarCheck size={20} weight="duotone" className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-semibold text-sm text-amber-900">
                {t(pulse.aging === 1
                  ? 'worker_admin.dashboard.aging_title'
                  : 'worker_admin.dashboard.aging_title_plural', { count: pulse.aging })}
              </p>
              <p className="font-body text-xs text-amber-700/80 mt-0.5">{t('worker_admin.dashboard.aging_sub')}</p>
            </div>
          </div>
        </Link>
      )}

      {/* Primary stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t('worker_admin.dashboard.stat_active_workers')}
          value={stats?.total ?? 0}
          color="text-primary"
          bg="bg-primary/10"
          icon={<Users size={22} weight="duotone" className="text-primary" />}
        />
        <StatCard
          label={t('worker_admin.dashboard.stat_awaiting_review')}
          value={stats?.submitted ?? 0}
          color="text-yellow-600"
          bg="bg-yellow-50"
          icon={<HourglassMedium size={22} weight="duotone" className="text-yellow-500" />}
        />
        <StatCard
          label={t('worker_admin.dashboard.stat_kyc_approved')}
          value={stats?.approved ?? 0}
          color="text-success-dark"
          bg="bg-success-light"
          icon={<CheckCircle size={22} weight="duotone" className="text-success" />}
        />
        <StatCard
          label={t('worker_admin.dashboard.stat_kyc_rejected')}
          value={stats?.rejected ?? 0}
          color="text-danger-dark"
          bg="bg-danger-light"
          icon={<XCircle size={22} weight="duotone" className="text-danger" />}
        />
      </div>

      {/* Removed workers callout (only when relevant) */}
      {(stats?.removed ?? 0) > 0 && (
        <Link
          to="/worker-admin/workers"
          className="card flex items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
            <MinusCircle size={20} weight="duotone" className="text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-gray-800">
              {t(stats!.removed === 1
                ? 'worker_admin.dashboard.removed_title'
                : 'worker_admin.dashboard.removed_title_plural', { count: stats!.removed })}
            </p>
            <p className="font-body text-xs text-gray-400 mt-0.5">
              {t('worker_admin.dashboard.removed_sub')}
            </p>
          </div>
        </Link>
      )}

      {/* Assigned societies */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Buildings size={16} weight="duotone" className="text-primary" />
          <h2 className="font-heading text-base font-bold text-gray-800">{t('worker_admin.dashboard.your_societies')}</h2>
          <span className="badge-success">{societies.length}</span>
        </div>

        {societies.length === 0 ? (
          <div className="card text-center py-8">
            <Buildings size={32} weight="duotone" className="text-gray-300 mx-auto mb-2" />
            <p className="font-body text-sm text-gray-400">{t('worker_admin.dashboard.no_societies')}</p>
            <p className="font-body text-xs text-gray-300 mt-1">{t('worker_admin.dashboard.no_societies_sub')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {societies.map((s) => (
              <div key={s.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Buildings size={18} weight="duotone" className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-body font-semibold text-gray-800 truncate">{s.name}</p>
                  <p className="font-body text-xs text-gray-400">{s.city}, {s.state}</p>
                </div>
                <span className={s.status === 'active' ? 'badge-success ml-auto' : 'badge-danger ml-auto'}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending KYC nudge */}
      {(stats?.submitted ?? 0) > 0 && (
        <Link
          to="/worker-admin/kyc"
          className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-yellow-100/70 transition-colors"
        >
          <HourglassMedium size={20} weight="duotone" className="text-yellow-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-gray-800">
              {t(stats!.submitted === 1
                ? 'worker_admin.dashboard.kyc_nudge_title'
                : 'worker_admin.dashboard.kyc_nudge_title_plural', { count: stats!.submitted })}
            </p>
            <p className="font-body text-xs text-gray-500 mt-0.5">{t('worker_admin.dashboard.kyc_nudge_sub')}</p>
          </div>
          <ClipboardText size={18} weight="duotone" className="text-yellow-500 shrink-0" />
        </Link>
      )}
    </div>
  )
}
