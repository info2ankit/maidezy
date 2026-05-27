import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

export default function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center py-16', className)}>
      <Loader2 size={28} className="animate-spin text-primary" />
    </div>
  )
}
