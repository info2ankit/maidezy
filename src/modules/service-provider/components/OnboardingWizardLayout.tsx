import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { SETUP_TOTAL_STEPS } from '@/shared/stores/workerProfileStore'
import { cn } from '@/shared/utils/cn'

interface OnboardingWizardLayoutProps {
  step:     number
  title:    string
  subtitle?: string
  onBack?:  () => void
  primaryAction?: {
    label:    string
    onClick:  () => void
    disabled?: boolean
    loading?:  boolean
  } | null
  children: ReactNode
}

export default function OnboardingWizardLayout({
  step,
  title,
  subtitle,
  onBack,
  primaryAction,
  children,
}: OnboardingWizardLayoutProps) {
  const { t } = useTranslation('worker')

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 flex items-center justify-center -ml-1.5"
              aria-label={t('profile.back')}
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <div className="w-9" />
          )}

          {/* Progress dots */}
          <div className="flex-1 flex items-center justify-center gap-2">
            {Array.from({ length: SETUP_TOTAL_STEPS }, (_, i) => {
              const dotStep = i + 1
              const isDone    = dotStep < step
              const isCurrent = dotStep === step
              return (
                <span
                  key={dotStep}
                  className={cn(
                    'rounded-full transition-all duration-200',
                    isCurrent ? 'w-6 h-2 bg-primary'     : '',
                    isDone    ? 'w-2 h-2 bg-accent'       : '',
                    !isDone && !isCurrent ? 'w-2 h-2 bg-gray-300' : '',
                  )}
                />
              )
            })}
          </div>

          <div className="w-9" />
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-bold text-gray-800 leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="font-body text-sm text-gray-500 mt-1.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {children}
        </div>
      </main>

      {/* ── Sticky footer ── */}
      {primaryAction !== null && primaryAction && (
        <footer className="sticky bottom-0 z-30 bg-white border-t border-gray-100 px-4 py-3">
          <div className="max-w-md mx-auto">
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              className={cn(
                'btn-primary w-full !py-3.5 min-h-[56px] flex items-center justify-center',
                primaryAction.loading && 'opacity-80',
              )}
            >
              {primaryAction.loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                primaryAction.label
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
