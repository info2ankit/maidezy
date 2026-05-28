import { useWorkerProfileStore } from '@/shared/stores/workerProfileStore'
import CityAndSocietyStep from './screens/CityAndSocietyStep'
import ServiceSelectionStep from './screens/ServiceSelectionStep'
import PricingStep from './screens/PricingStep'
import TimingStep from './screens/TimingStep'
import ProfilePreviewScreen from './screens/ProfilePreviewScreen'

export default function OnboardingWizard() {
  const currentStep = useWorkerProfileStore((s) => s.setupForm.currentStep)

  switch (currentStep) {
    case 1:  return <CityAndSocietyStep />
    case 2:  return <ServiceSelectionStep />
    case 3:  return <PricingStep />
    case 4:  return <TimingStep />
    case 5:  return <ProfilePreviewScreen />
    default: return <CityAndSocietyStep />
  }
}
