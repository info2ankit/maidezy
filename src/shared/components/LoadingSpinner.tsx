import { SpinnerGap } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'

export default function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center py-16', className)}>
      <SpinnerGap size={32} weight="bold" className="animate-spin text-primary" />
    </div>
  )
}
