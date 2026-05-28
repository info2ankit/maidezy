import { SpinnerGap, WarningCircle } from '@phosphor-icons/react'

export interface ConfirmDialogProps {
  title:          string
  message:        string
  confirmLabel?:  string
  cancelLabel?:   string
  variant?:       'danger' | 'success' | 'primary'
  isLoading?:     boolean
  disableConfirm?: boolean
  onConfirm:      () => void
  onCancel:       () => void
  children?:      React.ReactNode
}

const VARIANT_STYLES = {
  danger:  'bg-danger text-white hover:bg-danger/90',
  success: 'bg-success text-white hover:bg-success/90',
  primary: 'bg-primary text-white hover:bg-primary/90',
}

const ICON_STYLES = {
  danger:  'text-danger bg-danger-light',
  success: 'text-success bg-success-light',
  primary: 'text-primary bg-primary/10',
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel   = 'Confirm',
  cancelLabel    = 'Cancel',
  variant        = 'primary',
  isLoading      = false,
  disableConfirm = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Body */}
        <div className="px-5 pt-6 pb-5 flex gap-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${ICON_STYLES[variant]}`}>
            <WarningCircle size={20} weight="duotone" />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-gray-800 text-base leading-snug">{title}</p>
            <p className="font-body text-sm text-gray-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Optional extra content (e.g. rejection notes editor) */}
        {children && (
          <div className="px-5 pb-4">
            {children}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 font-body font-semibold text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || disableConfirm}
            className={`flex-1 py-2.5 rounded-xl font-body font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${VARIANT_STYLES[variant]}`}
          >
            {isLoading && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
