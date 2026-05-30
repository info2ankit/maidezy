import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, CurrencyInr } from '@phosphor-icons/react'
import { TIME_SLOTS, DISPLAY_TIMES, WORKING_DAYS } from '@/shared/constants/timeSlots'
import type { WorkingDayId } from '@/shared/constants/timeSlots'

const DAY_LABELS: Record<WorkingDayId, string> = {
  mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S',
}

type PriceCheck =
  | { ok: true;  parsed: number; errKey: null; errParams: undefined }
  | { ok: false; parsed: number; errKey: string; errParams: Record<string, unknown> | undefined }

// Reject prices that aren't a positive number, more than 10x the current,
// or below the current. Worker can match the original but not undercut.
function validatePrice(value: string, currentPrice: number): PriceCheck {
  const trimmed = value.trim()
  if (trimmed === '') {
    return { ok: false, errKey: 'booking.price_err_empty', errParams: undefined, parsed: 0 }
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, errKey: 'booking.price_err_format', errParams: undefined, parsed: 0 }
  }
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, errKey: 'booking.price_err_zero', errParams: undefined, parsed: n }
  }
  if (currentPrice > 0 && n < currentPrice) {
    return { ok: false, errKey: 'booking.price_err_low', errParams: { amount: currentPrice }, parsed: n }
  }
  if (currentPrice > 0 && n > currentPrice * 10) {
    return { ok: false, errKey: 'booking.price_err_high', errParams: undefined, parsed: n }
  }
  return { ok: true, errKey: null, errParams: undefined, parsed: n }
}

interface Props {
  initialArrivalTime?: string
  initialDays?:        WorkingDayId[]
  currentPrice:        number
  isSubmitting:        boolean
  onClose:             () => void
  onSubmit:            (input: { arrivalTime: string; daysOfWeek: WorkingDayId[]; note: string | null; price: number }) => void
}

export default function RescheduleProposalModal({
  initialArrivalTime,
  initialDays = [],
  currentPrice,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation('worker')
  const [isVisible,   setIsVisible]   = useState(false)
  const [arrivalTime, setArrivalTime] = useState<string>(initialArrivalTime ?? '08:00')
  const [days,        setDays]        = useState<WorkingDayId[]>(initialDays)
  const [note,        setNote]        = useState('')
  const [priceInput,  setPriceInput]  = useState<string>(String(currentPrice ?? ''))
  const [priceTouched, setPriceTouched] = useState(false)

  const priceCheck = useMemo(() => validatePrice(priceInput, currentPrice), [priceInput, currentPrice])
  const priceDelta = priceCheck.ok ? priceCheck.parsed - currentPrice : 0

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  function toggleDay(d: WorkingDayId) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  function handleSubmit() {
    setPriceTouched(true)
    if (days.length === 0 || !priceCheck.ok) return
    onSubmit({ arrivalTime, daysOfWeek: days, note: note.trim() || null, price: priceCheck.parsed })
  }

  const canSubmit = days.length > 0 && priceCheck.ok && !isSubmitting

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0 border-b border-gray-100">
          <div>
            <h2 className="font-heading font-bold text-gray-900 text-lg">{t('booking.counter_modal_title')}</h2>
            <p className="font-body text-xs text-gray-400 mt-0.5">
              {t('booking.counter_modal_subtitle')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={16} weight="bold" className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden flex-1 px-5 py-4 space-y-5">
          <div>
            <label className="block font-body text-xs font-semibold text-gray-600 mb-2">
              {t('booking.field_time')}
            </label>
            <select
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 font-body text-sm text-gray-700 outline-none"
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{DISPLAY_TIMES[t] ?? t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-gray-600 mb-2">
              {t('booking.field_days')}
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {WORKING_DAYS.map((d) => {
                const active = days.includes(d.id)
                return (
                  <button
                    key={d.id}
                    onClick={() => toggleDay(d.id)}
                    className={`text-xs font-body font-bold py-2.5 rounded-xl border transition-colors ${
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {DAY_LABELS[d.id]}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="block font-body text-xs font-semibold text-gray-600">
                {t('booking.field_price')}
              </label>
              <span className="font-body text-[10px] text-gray-400">
                {t('booking.field_price_current', { amount: currentPrice })}
              </span>
            </div>
            <div className={`flex items-center bg-white border rounded-xl px-3 py-2.5 ${priceTouched && !priceCheck.ok ? 'border-danger' : 'border-gray-200'}`}>
              <CurrencyInr size={16} weight="bold" className="text-gray-400 mr-1 shrink-0" />
              <input
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => { setPriceInput(e.target.value); setPriceTouched(true) }}
                onBlur={() => setPriceTouched(true)}
                placeholder={String(currentPrice)}
                className="flex-1 min-w-0 font-body text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
              />
              {priceCheck.ok && priceDelta > 0 && (
                <span className="font-body text-[10px] font-semibold text-emerald-600 shrink-0 ml-2">
                  +₹{priceDelta}
                </span>
              )}
            </div>
            {priceTouched && !priceCheck.ok && (
              <p className="font-body text-[11px] text-danger mt-1">{t(priceCheck.errKey, priceCheck.errParams)}</p>
            )}
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-gray-600 mb-1.5">
              {t('booking.field_note')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('booking.field_note_placeholder')}
              rows={3}
              maxLength={200}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 font-body text-sm text-gray-700 outline-none placeholder:text-gray-400 resize-none"
            />
            <p className="font-body text-[10px] text-gray-400 mt-1 text-right">
              {note.length}/200
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 px-5 py-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-accent text-white font-body font-semibold py-3 rounded-2xl text-sm hover:bg-accent-600 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('booking.counter_sending') : t('booking.counter_submit')}
          </button>
        </div>
      </div>
    </>
  )
}
