import { useTranslation } from 'react-i18next'
import { useWorkerProfileStore } from '@/shared/stores/workerProfileStore'
import OnboardingWizardLayout from '../components/OnboardingWizardLayout'
import PricingInputCard from '../components/PricingInputCard'

export default function PricingStep() {
  const { t } = useTranslation('worker')

  const selectedServices    = useWorkerProfileStore((s) => s.setupForm.selectedServices ?? [])
  const pricing             = useWorkerProfileStore((s) => s.setupForm.pricing ?? {})
  const errors              = useWorkerProfileStore((s) => s.setupForm.errors)
  const updatePrice         = useWorkerProfileStore((s) => s.updatePrice)
  const nextStep            = useWorkerProfileStore((s) => s.nextStep)
  const prevStep            = useWorkerProfileStore((s) => s.prevStep)
  const validateCurrentStep = useWorkerProfileStore((s) => s.validateCurrentStep)

  function handleNext() {
    if (validateCurrentStep()) nextStep()
  }

  return (
    <OnboardingWizardLayout
      step={2}
      title={t('profile.pricing_title')}
      subtitle={t('profile.pricing_subtitle')}
      onBack={prevStep}
      primaryAction={{
        label:   t('profile.next'),
        onClick: handleNext,
      }}
    >
      <div className="space-y-4">
        {selectedServices.map((id) => {
          const p = pricing[id]
          return (
            <PricingInputCard
              key={id}
              serviceTypeId={id}
              monthlyRate={p?.monthly ?? 0}
              perVisitRate={p?.perVisit ?? 0}
              hasError={Boolean(errors[`price_${id}`])}
              onChange={(mode, value) => updatePrice(id, mode, value)}
            />
          )
        })}
      </div>

      {/* Any error key under price_* */}
      {Object.keys(errors).some((k) => k.startsWith('price_')) && (
        <p className="font-body text-sm text-danger mt-3 text-center">{t('errors.add_price')}</p>
      )}
    </OnboardingWizardLayout>
  )
}
