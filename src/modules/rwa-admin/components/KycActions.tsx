import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import type { KycStatus } from '@/shared/types'

interface KycActionsProps {
  currentStatus: KycStatus
  onUpdate: (status: KycStatus) => Promise<void>
}

export default function KycActions({ currentStatus, onUpdate }: KycActionsProps) {
  const [pending, setPending] = useState<KycStatus | null>(null)

  if (currentStatus !== 'pending') return null

  async function handle(status: KycStatus) {
    setPending(status)
    try {
      await onUpdate(status)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={() => handle('approved')}
        disabled={pending !== null}
        className="w-9 h-9 rounded-xl bg-success/10 text-success hover:bg-success hover:text-white transition-all flex items-center justify-center disabled:opacity-50"
        title="Approve"
      >
        {pending === 'approved' ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
      </button>
      <button
        onClick={() => handle('rejected')}
        disabled={pending !== null}
        className="w-9 h-9 rounded-xl bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all flex items-center justify-center disabled:opacity-50"
        title="Reject"
      >
        {pending === 'rejected' ? <Loader2 size={16} className="animate-spin" /> : <X size={18} />}
      </button>
    </div>
  )
}
