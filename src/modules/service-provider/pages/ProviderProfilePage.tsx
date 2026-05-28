import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProvider } from '../components/ProviderContext'
import { useAuthStore } from '@/shared/stores/authStore'
import { saveWorkerName } from '@/shared/services/workerProfileService'
import { SERVICE_TYPE_BY_ID } from '@/shared/constants/serviceTypes'
import { DISPLAY_TIMES, WORKING_DAYS } from '@/shared/constants/timeSlots'
import { fetchSocieties } from '@/shared/services/societyService'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import KycBadge from '@/shared/components/KycBadge'
import KycNudgeBanner from '../components/KycNudgeBanner'
import type { Society } from '@/shared/types'
import type { WorkingDayId } from '@/shared/constants/timeSlots'

interface WorkerAvailability {
  shifts:       { start: string; end: string }[]
  working_days: WorkingDayId[]
}

export default function ProviderProfilePage() {
  const { t } = useTranslation('worker')
  const { provider, isLoading } = useProvider()
  const user    = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [societies, setSocieties]       = useState<Society[]>([])
  const [availability, setAvailability] = useState<WorkerAvailability | null>(null)

  // Name editing state
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue]     = useState('')
  const [nameSaving, setNameSaving]   = useState(false)
  const [nameError, setNameError]     = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  function startEditName() {
    setNameValue(user?.name ?? '')
    setNameError(null)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }

  function cancelEditName() {
    setEditingName(false)
    setNameError(null)
  }

  async function saveName() {
    if (!user) return
    const trimmed = nameValue.trim()
    if (!trimmed) { setNameError(t('errors.enter_name')); return }
    setNameSaving(true)
    setNameError(null)
    try {
      await saveWorkerName(user.id, trimmed)
      setUser({ ...user, name: trimmed })
      setEditingName(false)
    } catch (e) {
      setNameError((e as Error).message)
    } finally {
      setNameSaving(false)
    }
  }

  useEffect(() => {
    fetchSocieties().then(setSocieties)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('worker_availability')
      .select('shifts, working_days')
      .eq('worker_id', user.id)
      .maybeSingle()
      .then(({ data }) => setAvailability(data as WorkerAvailability | null))
  }, [user?.id])

  if (isLoading) return <LoadingSpinner />
  if (!provider)  return null

  const workerSocieties = (provider.society_ids ?? [])
    .map((id) => societies.find((s) => s.id === id))
    .filter(Boolean) as Society[]

  const city = workerSocieties[0]?.city ?? ''

  const shifts       = availability?.shifts       ?? (provider.availability_slots ?? [])
  const workingDays  = availability?.working_days ?? []

  return (
    <div className="max-w-md mx-auto space-y-4 pb-8">

      {/* ── Worker identity card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-primary px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white font-heading font-bold text-xl">
                {(user?.name ?? user?.mobile ?? '?')[0].toUpperCase()}
              </span>
            </div>
            <KycBadge status={provider.kyc_status} />
          </div>

          <div className="mt-3">
            {editingName ? (
              <div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName() }}
                  placeholder={t('profile.name_placeholder')}
                  className="w-full bg-white/20 text-white placeholder-white/50 font-heading font-bold text-lg rounded-xl px-3 py-1.5 outline-none border border-white/30 focus:border-white"
                />
                {nameError && (
                  <p className="font-body text-xs text-white/70 mt-1">{nameError}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={saveName}
                    disabled={nameSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-body font-semibold disabled:opacity-50"
                  >
                    {nameSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {t('profile.save')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditName}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-body font-semibold"
                  >
                    <X size={12} />
                    {t('profile.back')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-heading font-bold text-white text-lg leading-tight">
                  {user?.name ?? '—'}
                </p>
                <button
                  type="button"
                  onClick={startEditName}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
                  aria-label={t('profile.edit')}
                >
                  <Pencil size={13} className="text-white/80" />
                </button>
              </div>
            )}
            <p className="font-body text-white/70 text-sm mt-0.5">📱 {user?.mobile ?? '—'}</p>
          </div>
        </div>

      </div>

      {/* KYC nudge */}
      <KycNudgeBanner status={provider.kyc_status} />

      {/* ── City & Societies ── */}
      <Section title={t('profile.location_title')} icon="📍">
        {workerSocieties.length === 0 ? (
          <Empty />
        ) : (
          <>
            {city && (
              <p className="font-body text-sm text-gray-500 mb-2">
                {t('profile.city_subtitle')}: <span className="font-semibold text-gray-800">{city}</span>
              </p>
            )}
            <div className="space-y-2">
              {workerSocieties.map((soc) => (
                <div key={soc.id} className="flex items-start gap-2">
                  <span className="text-base mt-0.5">🏘️</span>
                  <div>
                    <p className="font-body text-sm font-semibold text-gray-800">{soc.name}</p>
                    <p className="font-body text-xs text-gray-400">{soc.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── Services & Pricing ── */}
      <Section title={t('profile.services_title')} icon="🛠️">
        {provider.services.length === 0 ? (
          <Empty />
        ) : (
          <div className="divide-y divide-gray-50">
            {provider.services.map((s) => {
              const def = SERVICE_TYPE_BY_ID[s.service_type as keyof typeof SERVICE_TYPE_BY_ID]
              if (!def) return null
              return (
                <div key={s.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                  <span className="text-xl shrink-0">{def.emoji}</span>
                  <span className="font-body text-sm text-gray-800 flex-1">{t(def.labelKey)}</span>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {(s.monthly_rate ?? 0) > 0 && (
                      <span className="font-heading font-semibold text-sm text-gray-800 tabular-nums">
                        ₹{s.monthly_rate?.toLocaleString('en-IN')}
                        <span className="text-xs font-body font-normal text-gray-400">{t('profile.rate_month')}</span>
                      </span>
                    )}
                    {(s.per_visit_rate ?? 0) > 0 && (
                      <span className="font-heading font-semibold text-sm text-gray-800 tabular-nums">
                        ₹{s.per_visit_rate?.toLocaleString('en-IN')}
                        <span className="text-xs font-body font-normal text-gray-400">{t('profile.rate_visit')}</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* ── Working hours ── */}
      <Section title={t('profile.timing_title')} icon="⏰">
        {shifts.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2 mb-4">
            {shifts.map((sh, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-body text-xs text-gray-400 w-14 shrink-0">
                  {t('profile.shift')} {i + 1}
                </span>
                <span className="font-heading font-semibold text-sm text-primary">
                  {DISPLAY_TIMES[sh.start] ?? sh.start} – {DISPLAY_TIMES[sh.end] ?? sh.end}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Working days */}
        <p className="font-body text-xs text-gray-400 mb-2">{t('profile.days_title')}</p>
        <div className="flex flex-wrap gap-1.5">
          {WORKING_DAYS.map(({ id }) => {
            const active = workingDays.includes(id as WorkingDayId)
            return (
              <span
                key={id}
                className={[
                  'px-2.5 py-1 rounded-full text-xs font-body font-medium',
                  active
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-400',
                ].join(' ')}
              >
                {t(`days.${id}`)}
              </span>
            )
          })}
        </div>
      </Section>

    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <p className="font-heading font-semibold text-sm text-gray-700">{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function Empty() {
  return <p className="font-body text-sm text-gray-400">—</p>
}
