import { useTranslation } from 'react-i18next'
import type { KycStatus } from '@/shared/types'
import { cn } from '@/shared/utils/cn'

const styles: Record<KycStatus, string> = {
  pending:   'badge-danger',    // red  — no docs submitted
  submitted: 'badge-pending',   // yellow — under review
  approved:  'badge-success',   // green
  rejected:  'badge-danger',    // red  — rejected
}

export default function KycBadge({ status, className }: { status: KycStatus; className?: string }) {
  const { t } = useTranslation('worker')
  return (
    <span className={cn(styles[status], className)}>
      {t(`kyc.badge_${status}`)}
    </span>
  )
}
