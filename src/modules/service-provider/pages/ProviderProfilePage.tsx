import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PencilSimple, Check, X, SpinnerGap,
  MapPin, Buildings, Toolbox, Clock, DeviceMobile,
  GenderIntersex, House, User, SignOut,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useProvider } from '../components/ProviderContext'
import { useAuthStore } from '@/shared/stores/authStore'
import { saveWorkerName, saveWorkerGenderAddress } from '@/shared/services/workerProfileService'
import { signOut } from '@/shared/services/authService'
import { SERVICE_TYPE_BY_ID } from '@/shared/constants/serviceTypes'
import { DISPLAY_TIMES, WORKING_DAYS } from '@/shared/constants/timeSlots'
import { fetchSocieties } from '@/shared/services/societyService'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import KycBadge from '@/shared/components/KycBadge'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import KycNudgeBanner from '../components/KycNudgeBanner'
import type { Society } from '@/shared/types'
import type { WorkingDayId } from '@/shared/constants/timeSlots'

type Gender = 'male' | 'female' | 'other'

interface WorkerAvailability {
  shifts:       { start: string; end: string }[]
  working_days: WorkingDayId[]
}

export default function ProviderProfilePage() {
  const { t } = useTranslation('worker')
  const { provider, isLoading, refresh } = useProvider()
  const user    = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout  = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut,    setLoggingOut]    = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOut()
      logout()
      navigate('/login', { replace: true })
    } catch {
      setLoggingOut(false)
      setConfirmLogout(false)
    }
  }

  const [societies, setSocieties]       = useState<Society[]>([])
  const [availability, setAvailability] = useState<WorkerAvailability | null>(null)

  // ── Name edit ──────────────────────────────────────────────────────────────
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

  function cancelEditName() { setEditingName(false); setNameError(null) }

  async function saveName() {
    if (!user) return
    const trimmed = nameValue.trim()
    if (!trimmed) { setNameError(t('errors.enter_name')); return }
    setNameSaving(true); setNameError(null)
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

  // ── Gender set (one-time) ──────────────────────────────────────────────────
  const [genderPick, setGenderPick]   = useState<Gender | ''>('')
  const [genderSaving, setGenderSaving] = useState(false)
  const [genderError, setGenderError]  = useState<string | null>(null)

  async function saveGender() {
    if (!user || !genderPick) return
    setGenderSaving(true); setGenderError(null)
    try {
      await saveWorkerGenderAddress(user.id, {
        gender:  genderPick,
        address: provider?.address ?? null,
      })
      await refresh()
    } catch (e) {
      setGenderError((e as Error).message)
    } finally {
      setGenderSaving(false)
    }
  }

  // ── Address edit ───────────────────────────────────────────────────────────
  const [editingAddress, setEditingAddress] = useState(false)
  const [addressValue, setAddressValue]     = useState('')
  const [addressSaving, setAddressSaving]   = useState(false)
  const [addressError, setAddressError]     = useState<string | null>(null)
  const addressRef = useRef<HTMLTextAreaElement>(null)

  function startEditAddress() {
    setAddressValue(provider?.address ?? '')
    setAddressError(null)
    setEditingAddress(true)
    setTimeout(() => addressRef.current?.focus(), 50)
  }

  function cancelEditAddress() { setEditingAddress(false); setAddressError(null) }

  async function saveAddress() {
    if (!user) return
    const trimmed = addressValue.trim()
    if (!trimmed) { setAddressError(t('errors.enter_address')); return }
    setAddressSaving(true); setAddressError(null)
    try {
      await saveWorkerGenderAddress(user.id, {
        gender:  provider?.gender ?? null,
        address: trimmed,
      })
      await refresh()
      setEditingAddress(false)
    } catch (e) {
      setAddressError((e as Error).message)
    } finally {
      setAddressSaving(false)
    }
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => { fetchSocieties().then(setSocieties) }, [])

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

  const city        = workerSocieties[0]?.city ?? ''
  const shifts      = availability?.shifts       ?? (provider.availability_slots ?? [])
  const workingDays = availability?.working_days ?? []
  const genderSet   = !!provider.gender

  return (
    <div className="max-w-md mx-auto space-y-4 pb-8">

      {/* ── Identity card ── */}
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
                {nameError && <p className="font-body text-xs text-white/70 mt-1">{nameError}</p>}
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={saveName} disabled={nameSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-body font-semibold disabled:opacity-50">
                    {nameSaving ? <SpinnerGap size={14} weight="bold" className="animate-spin" /> : <Check size={14} weight="bold" />}
                    {t('profile.save')}
                  </button>
                  <button type="button" onClick={cancelEditName}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-body font-semibold">
                    <X size={14} weight="bold" /> {t('profile.back')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-heading font-bold text-white text-lg leading-tight">{user?.name ?? '—'}</p>
                <button type="button" onClick={startEditName} aria-label={t('profile.edit')}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
                  <PencilSimple size={15} weight="bold" className="text-white/80" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <DeviceMobile size={13} weight="duotone" className="text-white/50 shrink-0" />
              <p className="font-body text-white/70 text-sm">{user?.mobile ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KYC nudge */}
      <KycNudgeBanner status={provider.kyc_status} />

      {/* ── Personal Info ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
          <User size={16} weight="duotone" className="text-primary shrink-0" />
          <p className="font-heading font-semibold text-sm text-gray-700 flex-1">{t('profile.personal_info_title')}</p>
        </div>
        <div className="px-5 py-4 space-y-5">

          {/* Gender — editable once */}
          <div>
            <p className="font-body text-xs text-gray-400 mb-2">{t('profile.gender_title')}</p>
            {genderSet ? (
              <div className="flex items-center gap-2">
                <GenderIntersex size={16} weight="duotone" className="text-primary shrink-0" />
                <span className="font-body text-sm font-semibold text-gray-800">
                  {t(`profile.gender_${provider.gender}`)}
                </span>
                <span className="ml-auto font-body text-[11px] text-gray-400">{t('profile.gender_locked')}</span>
              </div>
            ) : (
              <div>
                <div className="flex gap-2 mb-2">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setGenderPick(g)}
                      className={[
                        'flex-1 py-2 rounded-xl text-sm font-body font-semibold border-2 transition-colors',
                        genderPick === g
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50',
                      ].join(' ')}>
                      {t(`profile.gender_${g}`)}
                    </button>
                  ))}
                </div>
                {genderError && <p className="font-body text-xs text-danger mb-2">{genderError}</p>}
                <button type="button" onClick={saveGender} disabled={!genderPick || genderSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-body font-semibold disabled:opacity-40 transition-opacity">
                  {genderSaving ? <SpinnerGap size={13} weight="bold" className="animate-spin" /> : <Check size={13} weight="bold" />}
                  {t('profile.save')}
                </button>
              </div>
            )}
          </div>

          {/* Address — always editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-body text-xs text-gray-400">{t('profile.address_title')}</p>
              {!editingAddress && (
                <button type="button" onClick={startEditAddress}
                  className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  aria-label={t('profile.edit')}>
                  <PencilSimple size={13} weight="bold" className="text-gray-500" />
                </button>
              )}
            </div>
            {editingAddress ? (
              <div>
                <textarea
                  ref={addressRef}
                  value={addressValue}
                  onChange={(e) => setAddressValue(e.target.value)}
                  placeholder={t('profile.address_placeholder')}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-body text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary resize-none mb-2"
                />
                {addressError && <p className="font-body text-xs text-danger mb-2">{addressError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={saveAddress} disabled={addressSaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-body font-semibold disabled:opacity-50">
                    {addressSaving ? <SpinnerGap size={13} weight="bold" className="animate-spin" /> : <Check size={13} weight="bold" />}
                    {t('profile.save')}
                  </button>
                  <button type="button" onClick={cancelEditAddress}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-body font-semibold">
                    <X size={13} weight="bold" /> {t('profile.back')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <House size={15} weight="duotone" className="text-gray-400 shrink-0 mt-0.5" />
                <p className="font-body text-sm text-gray-800">
                  {provider.address || <span className="text-gray-400">—</span>}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── City & Societies ── */}
      <Section title={t('profile.location_title')} icon={MapPin}>
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
                  <Buildings size={16} weight="duotone" className="text-gray-400 mt-0.5 shrink-0" />
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
      <Section title={t('profile.services_title')} icon={Toolbox} editHref="/provider/edit-services">
        {provider.services.length === 0 ? (
          <Empty />
        ) : (
          <div className="divide-y divide-gray-50">
            {provider.services.map((s) => {
              const def = SERVICE_TYPE_BY_ID[s.service_type as keyof typeof SERVICE_TYPE_BY_ID]
              if (!def) return null
              return (
                <div key={s.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                  {(() => { const I = def.icon; return <I size={18} weight="duotone" className="text-primary shrink-0" /> })()}
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
      <Section title={t('profile.timing_title')} icon={Clock} editHref="/provider/edit-timings">
        {shifts.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2 mb-4">
            {shifts.map((sh, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-body text-xs text-gray-400 w-14 shrink-0">{t('profile.shift')} {i + 1}</span>
                <span className="font-heading font-semibold text-sm text-primary">
                  {DISPLAY_TIMES[sh.start] ?? sh.start} – {DISPLAY_TIMES[sh.end] ?? sh.end}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="font-body text-xs text-gray-400 mb-2">{t('profile.days_title')}</p>
        <div className="flex flex-wrap gap-1.5">
          {WORKING_DAYS.map(({ id }) => {
            const active = workingDays.includes(id as WorkingDayId)
            return (
              <span key={id} className={[
                'px-2.5 py-1 rounded-full text-xs font-body font-medium',
                active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400',
              ].join(' ')}>
                {t(`days.${id}`)}
              </span>
            )
          })}
        </div>
      </Section>

      {/* Logout */}
      <button
        type="button"
        onClick={() => setConfirmLogout(true)}
        className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-danger/30 bg-danger-light text-danger-dark font-body font-semibold text-sm hover:bg-danger/10 transition-colors"
      >
        <SignOut size={16} weight="bold" />
        {t('nav.logout')}
      </button>

      {confirmLogout && (
        <ConfirmDialog
          title={t('profile.logout_confirm_title')}
          message={t('profile.logout_confirm_message')}
          confirmLabel={t('profile.logout_confirm_yes')}
          cancelLabel={t('profile.logout_cancel')}
          variant="danger"
          isLoading={loggingOut}
          onConfirm={handleLogout}
          onCancel={() => setConfirmLogout(false)}
        />
      )}

    </div>
  )
}

function Section({ title, icon: SectionIcon, editHref, children }: {
  title:     string
  icon:      Icon
  editHref?: string
  children:  React.ReactNode
}) {
  const { t } = useTranslation('worker')
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
        <SectionIcon size={16} weight="duotone" className="text-primary shrink-0" />
        <p className="font-heading font-semibold text-sm text-gray-700 flex-1">{title}</p>
        {editHref && (
          <Link to={editHref} className="text-xs font-semibold text-accent font-body hover:underline">
            {t('dashboard.edit')}
          </Link>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function Empty() {
  return <p className="font-body text-sm text-gray-400">—</p>
}
