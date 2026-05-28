import { useTranslation } from 'react-i18next'
import { X, AlertCircle } from 'lucide-react'
import { useWorkerProfileStore } from '@/shared/stores/workerProfileStore'
import { TIME_SLOTS, WORKING_DAYS, DISPLAY_TIMES } from '@/shared/constants/timeSlots'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import type { WorkerShift } from '@/shared/types/worker.types'
import OnboardingWizardLayout from '../components/OnboardingWizardLayout'
import DayPill from '../components/DayPill'
import { cn } from '@/shared/utils/cn'

export default function TimingStep() {
  const { t } = useTranslation('worker')

  const shifts              = useWorkerProfileStore((s) => s.setupForm.shifts ?? [])
  const workingDays         = useWorkerProfileStore((s) => s.setupForm.workingDays ?? [])
  const errors              = useWorkerProfileStore((s) => s.setupForm.errors)
  const isSaving            = useWorkerProfileStore((s) => s.isSaving)
  const addShift            = useWorkerProfileStore((s) => s.addShift)
  const removeShift         = useWorkerProfileStore((s) => s.removeShift)
  const updateShiftStart    = useWorkerProfileStore((s) => s.updateShiftStart)
  const updateShiftEnd      = useWorkerProfileStore((s) => s.updateShiftEnd)
  const toggleDay           = useWorkerProfileStore((s) => s.toggleDay)
  const prevStep            = useWorkerProfileStore((s) => s.prevStep)
  const nextStep            = useWorkerProfileStore((s) => s.nextStep)
  const validateCurrentStep = useWorkerProfileStore((s) => s.validateCurrentStep)

  function handleSave() {
    if (validateCurrentStep()) nextStep()
  }

  return (
    <OnboardingWizardLayout
      step={3}
      title={t('profile.timing_title')}
      subtitle={t('profile.timing_subtitle')}
      onBack={prevStep}
      primaryAction={{
        label:   t('profile.save'),
        onClick: handleSave,
        loading: isSaving,
      }}
    >
      {/* Shift list */}
      <div className="space-y-4 mb-4">
        {shifts.map((shift, index) => (
          <ShiftRow
            key={index}
            index={index}
            shift={shift}
            canDelete={shifts.length > 1}
            onDelete={() => removeShift(index)}
            onStartChange={(t) => updateShiftStart(index, t)}
            onEndChange={(t) => updateShiftEnd(index, t)}
            shiftLabel={`${t('profile.shift')} ${index + 1}`}
            startLabel={t('profile.timing_start')}
            endLabel={t('profile.timing_end')}
          />
        ))}
      </div>

      {/* Shift error */}
      {errors.shifts && (
        <div className="flex items-start gap-2 bg-danger-light border border-danger/20 rounded-xl px-3 py-2.5 mb-4">
          <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" />
          <p className="text-sm font-body text-danger-dark">{t(errors.shifts)}</p>
        </div>
      )}

      {/* Add Shift button */}
      <button
        type="button"
        onClick={addShift}
        className="w-full min-h-[48px] rounded-2xl border-2 border-dashed border-primary/40 font-heading font-semibold text-sm text-primary hover:border-primary hover:bg-primary/5 transition-colors mb-6"
      >
        {t('profile.add_shift')}
      </button>

      {/* Working days */}
      <section>
        <p className="font-heading font-semibold text-gray-800 text-sm mb-3">
          {t('profile.days_title')}
        </p>
        <div className="flex gap-1.5">
          {WORKING_DAYS.map(({ id }) => (
            <DayPill
              key={id}
              day={id as WorkingDayId}
              isSelected={workingDays.includes(id as WorkingDayId)}
              onToggle={() => toggleDay(id as WorkingDayId)}
            />
          ))}
        </div>
        {errors.workingDays && (
          <p className="font-body text-xs text-danger mt-1">{t(errors.workingDays)}</p>
        )}
      </section>
    </OnboardingWizardLayout>
  )
}

// ─── Shift row ────────────────────────────────────────────────────────────────

interface ShiftRowProps {
  index:        number
  shift:        WorkerShift
  canDelete:    boolean
  shiftLabel:   string
  startLabel:   string
  endLabel:     string
  onDelete:     () => void
  onStartChange: (time: string) => void
  onEndChange:   (time: string) => void
}

function ShiftRow({
  shift,
  canDelete,
  shiftLabel,
  startLabel,
  endLabel,
  onDelete,
  onStartChange,
  onEndChange,
}: ShiftRowProps) {
  const { t } = useTranslation('worker')
  const invalidRange = shift.start && shift.end && shift.start >= shift.end

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-heading font-semibold text-gray-700 text-sm">{shiftLabel}</p>
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

      {/* Start time */}
      <div className="mb-3">
        <p className="font-body text-xs text-gray-400 mb-2">{startLabel}</p>
        <TimeSelector
          value={shift.start}
          onChange={onStartChange}
          filterFn={(h) => h <= 18}
        />
      </div>

      {/* End time */}
      <div>
        <p className="font-body text-xs text-gray-400 mb-2">{endLabel}</p>
        <TimeSelector
          value={shift.end}
          onChange={onEndChange}
          filterFn={(h) => h >= 6}
        />
      </div>

      {invalidRange && (
        <p className="font-body text-xs text-danger mt-2">{t('errors.end_after_start')}</p>
      )}
    </div>
  )
}

// ─── Compact time selector (horizontal scrollable pills) ──────────────────────

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
