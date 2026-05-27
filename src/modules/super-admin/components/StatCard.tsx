import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  variant: 'primary' | 'accent' | 'success' | 'purple'
  subtitle?: string
  isLoading?: boolean
}

const variantStyles = {
  primary: { bg: 'bg-primary/10', icon: 'text-primary', value: 'text-primary' },
  accent:  { bg: 'bg-accent/10',  icon: 'text-accent',  value: 'text-accent'  },
  success: { bg: 'bg-success/10', icon: 'text-success', value: 'text-success' },
  purple:  { bg: 'bg-purple-100', icon: 'text-purple-600', value: 'text-purple-600' },
}

export default function StatCard({ title, value, icon: Icon, variant, subtitle, isLoading }: StatCardProps) {
  const styles = variantStyles[variant]

  return (
    <div className="card flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', styles.bg)}>
        <Icon size={22} className={styles.icon} />
      </div>
      <div className="min-w-0">
        <p className="font-body text-sm text-gray-500 truncate">{title}</p>
        {isLoading ? (
          <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mt-0.5" />
        ) : (
          <p className={cn('font-heading text-2xl font-bold leading-tight', styles.value)}>{value}</p>
        )}
        {subtitle && <p className="font-body text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
