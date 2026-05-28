import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkerProfileStore } from '@/shared/stores/workerProfileStore'
import { useAuthStore } from '@/shared/stores/authStore'
import { useProvider } from '../components/ProviderContext'
import { SERVICE_TYPE_BY_ID } from '@/shared/constants/serviceTypes'
import { DISPLAY_TIMES } from '@/shared/constants/timeSlots'
import { fetchSocieties } from '@/shared/services/societyService'
import OnboardingWizardLayout from '../components/OnboardingWizardLayout'
import type { Society } from '@/shared/types'

export default function ProfilePreviewScreen() {
  const { t } = useTranslation('worker')
  const authUser  = useAuthStore((s) => s.user)
  const setUser   = useAuthStore((s) => s.setUser)
  const userId    = authUser?.id
  const { refresh } = useProvider()

  const rawForm        = useWorkerProfileStore((s) => s.setupForm)
  const setupForm      = {
    ...rawForm,
    selectedServices: rawForm.selectedServices ?? [],
    shifts:           rawForm.shifts           ?? [],
    workingDays:      rawForm.workingDays       ?? [],
    pricing:          rawForm.pricing           ?? {},
    societyIds:       rawForm.societyIds        ?? [],
  }

  const [societies, setSocieties] = useState<Society[]>([])
  useEffect(() => { fetchSocieties().then(setSocieties) }, [])
  const isSaving       = useWorkerProfileStore((s) => s.isSaving)
  const error          = useWorkerProfileStore((s) => s.error)
  const saveProfile    = useWorkerProfileStore((s) => s.saveProfile)
  const prevStep       = useWorkerProfileStore((s) => s.prevStep)
  const resetSetupForm = useWorkerProfileStore((s) => s.resetSetupForm)

  async function handleGoLive() {
    if (!userId || !authUser) return
    try {
      await saveProfile(userId)
      if (setupForm.workerName.trim() && authUser) {
        setUser({ ...authUser, name: setupForm.workerName.trim() })
      }
      await refresh()
      resetSetupForm()
    } catch {
      // error already in store
    }
  }

  const dayLabels = setupForm.workingDays.map((d) => t(`days.${d}`)).join('  ')

  return (
    <OnboardingWizardLayout
      step={5}
      title={t('profile.preview_title')}
      onBack={prevStep}
      primaryAction={{
        label:   t('profile.go_live'),
        onClick: handleGoLive,
        loading: isSaving,
      }}
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        {/* Name */}
        {setupForm.workerName && (
          <div className="px-4 py-4 border-b border-gray-50">
            <p className="font-body text-xs text-gray-400 mb-1">{t('profile.name_title')}</p>
            <p className="font-body text-sm font-semibold text-gray-800">👤 {setupForm.workerName}</p>
          </div>
        )}

        {/* City + Societies */}
        <div className="px-4 py-4 border-b border-gray-50">
          <p className="font-body text-xs text-gray-400 mb-2">{t('profile.city_subtitle')}</p>
          <p className="font-body text-sm font-medium text-gray-800 mb-2">📍 {setupForm.cityName}</p>
          <div className="space-y-1">
            {setupForm.societyIds.map((id) => {
              const soc = societies.find((s) => s.id === id)
              return (
                <p key={id} className="font-body text-sm text-gray-700">
                  🏘️ {soc ? soc.name : id}
                </p>
              )
            })}
          </div>
        </div>

        {/* Services */}
        <div className="px-4 py-4 border-b border-gray-50">
          <p className="font-body text-xs text-gray-400 mb-2">{t('profile.services_title')}</p>
          <div className="flex flex-wrap gap-2">
            {setupForm.selectedServices.map((id) => {
              const def = SERVICE_TYPE_BY_ID[id]
              return (
                <span key={id} className="inline-flex items-center gap-1 bg-orange-50 text-accent rounded-full px-2.5 py-1 text-xs font-body font-medium border border-orange-100">
                  {def.emoji} {t(def.labelKey)}
                </span>
              )
            })}
          </div>
        </div>

        {/* Shifts */}
        <div className="px-4 py-4 border-b border-gray-50">
          <p className="font-body text-xs text-gray-400 mb-2">{t('profile.timing_title')}</p>
          <div className="space-y-1">
            {setupForm.shifts.map((sh, i) => (
              <p key={i} className="font-body text-sm text-gray-700">
                ⏰ {DISPLAY_TIMES[sh.start] ?? sh.start} – {DISPLAY_TIMES[sh.end] ?? sh.end}
              </p>
            ))}
          </div>
          <p className="font-body text-sm text-gray-500 mt-1.5">📅 {dayLabels}</p>
        </div>

        {/* Pricing */}
        <div className="px-4 py-4">
          <p className="font-body text-xs text-gray-400 mb-2">{t('profile.pricing_title')}</p>
          {setupForm.selectedServices.map((id) => {
            const p = setupForm.pricing[id]
            const def = SERVICE_TYPE_BY_ID[id]
            if (!p) return null
            return (
              <div key={id} className="flex items-center justify-between py-1.5">
                <span className="font-body text-sm text-gray-700">{def.emoji} {t(def.labelKey)}</span>
                <span className="font-heading font-semibold text-sm text-gray-800 tabular-nums">
                  {p.monthly > 0 ? `₹${p.monthly.toLocaleString('en-IN')}/mo` : ''}
                  {p.monthly > 0 && p.perVisit > 0 ? '  ' : ''}
                  {p.perVisit > 0 ? `₹${p.perVisit.toLocaleString('en-IN')}/visit` : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4">
          <p className="font-body text-sm text-danger-dark">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={prevStep}
        className="w-full py-3 font-body text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← {t('profile.edit')}
      </button>
    </OnboardingWizardLayout>
  )
}
