import { cn } from '@/shared/utils/cn'
import { DISPLAY_TIMES } from '@/shared/constants/timeSlots'

interface TimePillProps {
  time:       string   // '07:00'
  isSelected: boolean
  onPress:    () => void
}

export default function TimePill({ time, isSelected, onPress }: TimePillProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={isSelected}
      className={cn(
        'shrink-0 min-w-[64px] min-h-[48px] px-3 rounded-2xl border-2',
        'font-heading font-semibold text-sm tabular-nums',
        'transition-all duration-150 active:scale-95',
        isSelected
          ? 'border-primary bg-primary text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
      )}
    >
      {DISPLAY_TIMES[time] ?? time}
    </button>
  )
}
