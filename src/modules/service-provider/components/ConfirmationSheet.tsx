import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/utils/cn'

interface ConfirmationSheetProps {
  title:         string
  message:       string
  confirmLabel:  string
  cancelLabel:   string
  onConfirm:     () => void
  onCancel:      () => void
  isDangerous?:  boolean
}

export default function ConfirmationSheet({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmationSheetProps) {
  // Prevent body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Portal renders outside any transformed ancestor so `fixed` positioning
  // is always relative to the viewport, not a Framer Motion animated parent.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl px-4 pt-5 pb-8 max-w-md mx-auto w-full">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <h3 className="font-heading font-bold text-gray-800 text-lg text-center mb-2">
          {title}
        </h3>
        <p className="font-body text-gray-500 text-sm text-center mb-6 leading-relaxed">
          {message}
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'w-full min-h-[56px] rounded-2xl font-heading font-bold text-base transition-colors',
              isDangerous
                ? 'bg-danger text-white active:bg-danger/90'
                : 'bg-success text-white active:bg-success/90',
            )}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[56px] rounded-2xl border-2 border-gray-200 font-heading font-semibold text-base text-gray-600 hover:border-gray-300 transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
