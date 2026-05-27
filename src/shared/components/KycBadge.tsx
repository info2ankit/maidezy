import type { KycStatus } from '@/shared/types'
import { cn } from '@/shared/utils/cn'

const styles: Record<KycStatus, string> = {
  pending:  'badge-pending',
  approved: 'badge-success',
  rejected: 'badge-danger',
}

const labels: Record<KycStatus, string> = {
  pending:  'KYC Pending',
  approved: 'KYC Approved',
  rejected: 'KYC Rejected',
}

export default function KycBadge({ status, className }: { status: KycStatus; className?: string }) {
  return <span className={cn(styles[status], className)}>{labels[status]}</span>
}
