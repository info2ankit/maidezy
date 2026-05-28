import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchSocieties } from '@/shared/services/societyService'
import { useWorkerProfileStore } from '@/shared/stores/workerProfileStore'
import OnboardingWizardLayout from '../components/OnboardingWizardLayout'
import type { Society } from '@/shared/types'

const MAX_SOCIETIES = 3

export default function CityAndSocietyStep() {
  const { t } = useTranslation('worker')

  const workerName   = useWorkerProfileStore((s) => s.setupForm.workerName)
  const cityName     = useWorkerProfileStore((s) => s.setupForm.cityName)
  const societyIds   = useWorkerProfileStore((s) => s.setupForm.societyIds ?? [])
  const errors       = useWorkerProfileStore((s) => s.setupForm.errors)
  const setName      = useWorkerProfileStore((s) => s.setName)
  const setCity      = useWorkerProfileStore((s) => s.setCity)
  const toggleSociety = useWorkerProfileStore((s) => s.toggleSociety)
  const nextStep     = useWorkerProfileStore((s) => s.nextStep)
  const validateCurrentStep = useWorkerProfileStore((s) => s.validateCurrentStep)

  const [societies, setSocieties] = useState<Society[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  useEffect(() => {
    fetchSocieties()
      .then(setSocieties)
      .finally(() => setLoading(false))
  }, [])

  const cities = useMemo(() => {
    const seen = new Set<string>()
    return societies
      .filter((s) => s.status === 'active' && s.city && !seen.has(s.city) && seen.add(s.city))
      .map((s) => s.city)
      .sort()
  }, [societies])

  const filteredSocieties = useMemo(() => {
    if (!cityName) return []
    const q = search.trim().toLowerCase()
    return societies.filter(
      (s) =>
        s.status === 'active' &&
        s.city === cityName &&
        (q === '' || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)),
    )
  }, [societies, cityName, search])

  function handleNext() {
    if (validateCurrentStep()) nextStep()
  }

  const atMax = societyIds.length >= MAX_SOCIETIES

  return (
    <OnboardingWizardLayout
      step={1}
      title={t('profile.setup_title')}
      primaryAction={{
        label:    t('profile.next'),
        onClick:  handleNext,
        disabled: !workerName.trim() || !cityName || societyIds.length === 0,
      }}
    >
      {/* Name input — always visible */}
      <div className="mb-6">
        <p className="font-body text-xs text-gray-400 mb-2">{t('profile.name_title')}</p>
        <input
          type="text"
          value={workerName}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('profile.name_placeholder')}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-body text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary"
        />
        {errors.name && (
          <p className="font-body text-sm text-danger mt-1.5">{t(errors.name)}</p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* City pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {cities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setCity(city)}
                className={[
                  'px-4 py-2 rounded-full text-sm font-body font-medium border transition-colors',
                  cityName === city
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary',
                ].join(' ')}
              >
                {city}
              </button>
            ))}
          </div>

          {errors.city && (
            <p className="font-body text-sm text-danger mb-3">{t(errors.city)}</p>
          )}

          {/* Society section — shown after city selected */}
          {cityName && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="font-body text-xs text-gray-400">{t('profile.society_title')}</p>
                <p className="font-body text-xs text-gray-400">
                  {societyIds.length}/{MAX_SOCIETIES}
                </p>
              </div>

              {atMax && (
                <p className="font-body text-xs text-accent mb-2">{t('profile.society_max')}</p>
              )}

              {/* Search */}
              <div className="mb-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('profile.society_search')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-body text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Society rows */}
              <div className="space-y-2">
                {filteredSocieties.length === 0 ? (
                  <p className="text-center font-body text-sm text-gray-400 py-4">
                    {search ? t('profile.society_no_results') : t('profile.society_none_in_city')}
                  </p>
                ) : (
                  filteredSocieties.map((soc) => {
                    const isSelected = societyIds.includes(soc.id)
                    const isDisabled = atMax && !isSelected
                    return (
                      <button
                        key={soc.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggleSociety(soc.id)}
                        className={[
                          'w-full text-left px-4 py-3 rounded-xl border transition-colors',
                          isSelected
                            ? 'border-accent bg-orange-50'
                            : isDisabled
                              ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                              : 'border-gray-100 bg-white hover:border-gray-300',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-body text-sm font-medium text-gray-800">{soc.name}</p>
                            <p className="font-body text-xs text-gray-400 mt-0.5">{soc.address}</p>
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0 ml-2">
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {errors.society && (
                <p className="font-body text-sm text-danger mt-3">{t(errors.society)}</p>
              )}
            </>
          )}
        </>
      )}
    </OnboardingWizardLayout>
  )
}
