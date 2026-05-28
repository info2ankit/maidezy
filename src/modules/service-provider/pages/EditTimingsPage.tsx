import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, X, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/shared/stores/authStore'
import { useProvider } from '../components/ProviderContext'
import { saveWorkerAvailability } from '@/shared/services/workerProfileService'
import { TIME_SLOTS, WORKING_DAYS, DISPLAY_TIMES } from '@/shared/constants/timeSlots'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import DayPill from '../components/DayPill'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import { cn } from '@/shared/utils/cn'
import type { WorkerShift } from '@/shared/types/worker.types'

const DEFAULT_SHIFT: WorkerShift = { start: '08:00', end: '12:00' }

export default function EditTimingsPage() {
  const { t } = useTranslation('worker')
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { refresh } = useProvider()

  const [shifts, setShifts]           = useState<WorkerShift[]>([DEFAULT_SHIFT])
  const [workingDays, setWorkingDays] = useState<WorkingDayId[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [isSaving, setIsSaving]       = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    supabase
      .from('worker_availability')
      .select('shifts, working_days')
      .eq('worker_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setShifts((data.shifts as WorkerShift[]) ?? [DEFAULT_SHIFT])
          setWorkingDays((data.working_days as WorkingDayId[]) ?? [])
        }
        setIsLoading(false)
      }, () => setIsLoading(false))
  }, [user])

  function addShift() {
    setShifts((prev) => [...prev, { ...DEFAULT_SHIFT }])
  }

  function removeShift(index: number) {
    setShifts((prev) => prev.filter((_, i) => i !== index))
  }

  function updateStart(index: number, start: string) {
    setShifts((prev) => prev.map((s, i) => (i === index ? { ...s, start } : s)))
  }

  function updateEnd(index: number, end: string) {
    setShifts((prev) => prev.map((s, i) => (i === index ? { ...s, end } : s)))
  }

  function toggleDay(day: WorkingDayId) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    shifts.forEach((s, i) => {
      if (!s.start) errs[`shift_${i}_start`] = t('errors.select_start')
      if (!s.end)   errs[`shift_${i}_end`]   = t('errors.select_end')
      if (s.start && s.end && s.start >= s.end)
        errs[`shift_${i}_range`] = t('errors.end_after_start')
    })
    if (workingDays.length === 0) errs.days = t('errors.select_days')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!user || !validate()) return
    setIsSaving(true)
    setError(null)
    try {
      await saveWorkerAvailability(user.id, { shifts, workingDays })
      await refresh()
      navigate('/provider/profile')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="max-w-md mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/provider/profile')}
          className="w-9 h-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-800">{t('profile.timing_title')}</h1>
          <p className="font-body text-sm text-gray-400 mt-0.5">{t('profile.timing_subtitle')}</p>
        </div>
      </div>

      {/* Shifts */}
      <div className="space-y-4 mb-4">
        {shifts.map((shift, index) => (
          <ShiftCard
            key={index}
            index={index}
            shift={shift}
            canDelete={shifts.length > 1}
            errors={fieldErrors}
            onDelete={() => removeShift(index)}
            onStartChange={(v) => updateStart(index, v)}
            onEndChange={(v) => updateEnd(index, v)}
          />
        ))}
      </div>

      {/* Add shift */}
      <button
        type="button"
        onClick={addShift}
        className="w-full min-h-[48px] rounded-2xl border-2 border-dashed border-primary/40 font-heading font-semibold text-sm text-primary hover:border-primary hover:bg-primary/5 transition-colors mb-6"
      >
        {t('profile.add_shift')}
      </button>

      {/* Working days */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6">
        <p className="font-heading font-semibold text-gray-800 text-sm mb-3">{t('profile.days_title')}</p>
        <div className="flex gap-1.5 flex-wrap">
          {WORKING_DAYS.map(({ id }) => (
            <DayPill
              key={id}
              day={id as WorkingDayId}
              isSelected={workingDays.includes(id as WorkingDayId)}
              onToggle={() => toggleDay(id as WorkingDayId)}
            />
          ))}
        </div>
        {fieldErrors.days && (
          <p className="font-body text-xs text-danger mt-2">{fieldErrors.days}</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-danger font-body mb-3 text-center">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full h-12 rounded-2xl bg-primary text-white font-heading font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
      >
        {isSaving && <Loader2 size={16} className="animate-spin" />}
        {isSaving ? t('profile.saving') : t('profile.save')}
      </button>
    </div>
  )
}

// ─── Shift card ───────────────────────────────────────────────────────────────

interface ShiftCardProps {
  index:         number
  shift:         WorkerShift
  canDelete:     boolean
  errors:        Record<string, string>
  onDelete:      () => void
  onStartChange: (v: string) => void
  onEndChange:   (v: string) => void
}

function ShiftCard({ index, shift, canDelete, errors, onDelete, onStartChange, onEndChange }: ShiftCardProps) {
  const { t } = useTranslation('worker')
  const rangeError = errors[`shift_${index}_range`]

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-heading font-semibold text-gray-700 text-sm">
          {t('profile.shift')} {index + 1}
        </p>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-danger-light text-gray-400 hover:text-danger flex items-center justify-center transition-colors"
            aria-label={t('profile.remove_shift')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="mb-3">
        <p className="font-body text-xs text-gray-400 mb-2">{t('profile.timing_start')}</p>
        <TimeSelector value={shift.start} onChange={onStartChange} filterFn={(h) => h <= 18} />
        {errors[`shift_${index}_start`] && (
          <p className="font-body text-xs text-danger mt-1">{errors[`shift_${index}_start`]}</p>
        )}
      </div>

      <div>
        <p className="font-body text-xs text-gray-400 mb-2">{t('profile.timing_end')}</p>
        <TimeSelector value={shift.end} onChange={onEndChange} filterFn={(h) => h >= 6} />
        {errors[`shift_${index}_end`] && (
          <p className="font-body text-xs text-danger mt-1">{errors[`shift_${index}_end`]}</p>
        )}
      </div>

      {rangeError && (
        <div className="flex items-center gap-2 mt-2 text-xs text-danger font-body">
          <AlertCircle size={12} className="shrink-0" />
          {rangeError}
        </div>
      )}
    </div>
  )
}

// ─── Time selector ────────────────────────────────────────────────────────────

interface TimeSelectorProps {
  value:    string
  onChange: (time: string) => void
  filterFn: (hour: number) => boolean
}

function TimeSelector({ value, onChange, filterFn }: TimeSelectorProps) {
  const options = TIME_SLOTS.filter((t) => filterFn(Number(t.split(':')[0])))

  return (
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none">
      {options.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onChange(slot)}
          aria-pressed={value === slot}
          className={cn(
            'shrink-0 min-w-[56px] h-10 rounded-xl border-2',
            'font-heading font-semibold text-xs tabular-nums',
            'transition-all duration-150 active:scale-95',
            value === slot
              ? 'border-primary bg-primary text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
          )}
        >
          {DISPLAY_TIMES[slot] ?? slot}
        </button>
      ))}
    </div>
  )
}
