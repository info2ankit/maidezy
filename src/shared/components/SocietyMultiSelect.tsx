import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, MagnifyingGlass, Buildings, Check, CaretDown } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'
import type { Society } from '@/shared/types'

interface SocietyMultiSelectProps {
  societies: Society[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export default function SocietyMultiSelect({
  societies,
  selectedIds,
  onChange,
  disabled,
}: SocietyMultiSelectProps) {
  const { t } = useTranslation('worker')
  const [open, setOpen] = useState(false)

  const triggerLabel = selectedIds.length === 0
    ? t('onboarding.step1.society_placeholder')
    : selectedIds.length === 1
      ? t('onboarding.step1.society_count_one')
      : t('onboarding.step1.society_count_many', { count: selectedIds.length })

  const selectedSocieties = useMemo(
    () => societies.filter((s) => selectedIds.includes(s.id)),
    [societies, selectedIds],
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-3.5 rounded-2xl border-2 transition-all duration-150',
          'min-h-[56px] text-left',
          selectedIds.length > 0
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 bg-white hover:border-gray-300',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Buildings size={18} weight={selectedIds.length > 0 ? 'duotone' : 'regular'} className={selectedIds.length > 0 ? 'text-primary' : 'text-gray-400'} />
        <span className={cn(
          'flex-1 font-body font-semibold text-sm truncate',
          selectedIds.length > 0 ? 'text-primary' : 'text-gray-400',
        )}>
          {triggerLabel}
        </span>
        <CaretDown size={16} weight="bold" className="text-gray-400 shrink-0" />
      </button>

      {/* Selected chips — visible below trigger when multiple are chosen */}
      {selectedSocieties.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedSocieties.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold font-body px-2.5 py-1 rounded-full"
            >
              {s.name}
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter((id) => id !== s.id))}
                className="hover:bg-primary/20 rounded-full"
                aria-label={`Remove ${s.name}`}
              >
                <X size={12} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <SocietyPickerSheet
          societies={societies}
          selectedIds={selectedIds}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

interface SheetProps {
  societies: Society[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onClose: () => void
}

function SocietyPickerSheet({ societies, selectedIds, onChange, onClose }: SheetProps) {
  const { t } = useTranslation('worker')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return societies
    return societies.filter((s) =>
      `${s.name} ${s.city} ${s.state} ${s.pincode}`.toLowerCase().includes(q),
    )
  }, [societies, query])

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-heading text-lg font-bold text-gray-800">
            {t('onboarding.step1.society_label')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('onboarding.step1.society_search_placeholder')}
              className="input-field !pl-9 !py-2.5"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 font-body py-10">
              {t('onboarding.step1.society_no_results')}
            </p>
          ) : (
            <ul>
              {filtered.map((s) => {
                const isSelected = selectedIds.includes(s.id)
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => toggle(s.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors',
                        'min-h-[56px]',
                        isSelected ? 'bg-primary/5' : 'hover:bg-gray-50',
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300',
                      )}>
                        {isSelected && <Check size={14} weight="bold" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading font-semibold text-gray-800 text-sm truncate">
                          {s.name}
                        </p>
                        <p className="font-body text-xs text-gray-400 truncate">
                          {s.city}, {s.state} · {s.pincode}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary w-full !py-3"
          >
            {t('onboarding.step1.society_done')}
            {selectedIds.length > 0 && ` (${selectedIds.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
