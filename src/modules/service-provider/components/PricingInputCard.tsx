import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/cn'
import { SERVICE_TYPE_BY_ID } from '@/shared/constants/serviceTypes'
import type { ServiceTypeId } from '@/shared/constants/serviceTypes'

interface PricingInputCardProps {
  serviceTypeId: ServiceTypeId
  monthlyRate:   number
  perVisitRate:  number
  hasError?:     boolean
  onChange:      (mode: 'monthly' | 'perVisit', value: number) => void
}

export default function PricingInputCard({
  serviceTypeId,
  monthlyRate,
  perVisitRate,
  hasError,
  onChange,
}: PricingInputCardProps) {
  const { t } = useTranslation('worker')
  const def = SERVICE_TYPE_BY_ID[serviceTypeId]

  function handleChange(mode: 'monthly' | 'perVisit', raw: string) {
    const digits = raw.replace(/\D/g, '')
    onChange(mode, digits === '' ? 0 : Number(digits))
  }

  return (
    <div className={cn(
      'bg-white rounded-2xl border-2 p-4',
      hasError ? 'border-danger/50' : 'border-gray-100',
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl" aria-hidden="true">{def.emoji}</span>
        <p className="font-heading font-bold text-gray-800 text-base">{t(def.labelKey)}</p>
      </div>

      {/* Monthly rate */}
      <div className="mb-3">
        <label className="font-body text-xs text-gray-400 mb-1 block">
          {t('profile.per_month')}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-gray-500 text-sm pointer-events-none">₹</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={monthlyRate || ''}
            onChange={(e) => handleChange('monthly', e.target.value)}
            placeholder="0"
            className="input-field !pl-7 w-full"
          />
        </div>
      </div>

      {/* Per-visit rate */}
      <div>
        <label className="font-body text-xs text-gray-400 mb-1 block">
          {t('profile.per_visit')}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-gray-500 text-sm pointer-events-none">₹</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={perVisitRate || ''}
            onChange={(e) => handleChange('perVisit', e.target.value)}
            placeholder="0"
            className="input-field !pl-7 w-full"
          />
        </div>
      </div>

      <p className="font-body text-[11px] text-gray-400 mt-2">{t('profile.market_rate')}</p>
    </div>
  )
}
