import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/cn'
import type { ServiceTypeId } from '@/shared/constants/serviceTypes'
import { SERVICE_TYPE_BY_ID } from '@/shared/constants/serviceTypes'

interface ServiceCardProps {
  serviceTypeId: ServiceTypeId
  isSelected:    boolean
  onToggle:      () => void
}

export default function ServiceCard({ serviceTypeId, isSelected, onToggle }: ServiceCardProps) {
  const { t } = useTranslation('worker')
  const def = SERVICE_TYPE_BY_ID[serviceTypeId]
  const IconComp = def.icon

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSelected}
      className={cn(
        'min-h-[88px] w-full rounded-2xl border-2 flex flex-col items-center justify-center gap-2',
        'transition-all duration-150 active:scale-95 px-2',
        isSelected
          ? 'border-accent bg-orange-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300',
      )}
    >
      <IconComp
        size={32}
        weight={isSelected ? 'fill' : 'duotone'}
        className={isSelected ? 'text-accent' : 'text-gray-400'}
      />
      <span className={cn(
        'font-body font-semibold text-xs text-center leading-tight',
        isSelected ? 'text-accent' : 'text-gray-700',
      )}>
        {t(def.labelKey)}
      </span>
    </button>
  )
}
