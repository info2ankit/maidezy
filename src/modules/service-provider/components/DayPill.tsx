import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/cn'
import type { WorkingDayId } from '@/shared/constants/timeSlots'

interface DayPillProps {
  day:        WorkingDayId
  isSelected: boolean
  onToggle:   () => void
}

export default function DayPill({ day, isSelected, onToggle }: DayPillProps) {
  const { t } = useTranslation('worker')

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSelected}
      className={cn(
        'flex-1 min-h-[44px] rounded-xl border-2 font-heading font-semibold text-xs',
        'transition-all duration-150 active:scale-95',
        isSelected
          ? 'border-primary bg-primary text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
      )}
    >
      {t(`days.${day}`)}
    </button>
  )
}
