import { useTranslation } from 'react-i18next'
import { SERVICE_TYPES } from '@/shared/constants/serviceTypes'
import { useWorkerProfileStore } from '@/shared/stores/workerProfileStore'
import OnboardingWizardLayout from '../components/OnboardingWizardLayout'
import ServiceCard from '../components/ServiceCard'

export default function ServiceSelectionStep() {
  const { t } = useTranslation('worker')

  const selectedServices   = useWorkerProfileStore((s) => s.setupForm.selectedServices ?? [])
  const errors             = useWorkerProfileStore((s) => s.setupForm.errors)
  const toggleService      = useWorkerProfileStore((s) => s.toggleService)
  const nextStep           = useWorkerProfileStore((s) => s.nextStep)
  const validateCurrentStep = useWorkerProfileStore((s) => s.validateCurrentStep)

  function handleNext() {
    if (validateCurrentStep()) nextStep()
  }

  const count = selectedServices.length
  const countLabel = count === 1
    ? t('profile.selected_count_one')
    : t('profile.selected_count_many', { count })

  return (
    <OnboardingWizardLayout
      step={1}
      title={t('profile.services_title')}
      subtitle={t('profile.services_subtitle')}
      primaryAction={{
        label:    t('profile.next'),
        onClick:  handleNext,
        disabled: count === 0,
      }}
    >
      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {SERVICE_TYPES.map((service) => (
          <ServiceCard
            key={service.id}
            serviceTypeId={service.id}
            isSelected={selectedServices.includes(service.id)}
            onToggle={() => toggleService(service.id)}
          />
        ))}
      </div>

      {/* Selection count + error */}
      {count > 0 && (
        <p className="text-center font-body text-sm text-accent font-semibold">{countLabel}</p>
      )}
      {errors.services && (
        <p className="text-center font-body text-sm text-danger mt-1">{t(errors.services)}</p>
      )}
    </OnboardingWizardLayout>
  )
}
