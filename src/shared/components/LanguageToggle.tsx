import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/cn'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/i18n'

interface LanguageToggleProps {
  /** Light variant for dark backgrounds (sidebars, navy headers). */
  variant?: 'default' | 'onDark'
  className?: string
}

const LABELS: Record<SupportedLanguage, string> = {
  hi: 'हिंदी',
  en: 'EN',
}

export default function LanguageToggle({ variant = 'default', className }: LanguageToggleProps) {
  const { i18n } = useTranslation()

  // Normalize "en-US" → "en" so the active state lights up correctly.
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'hi').split('-')[0] as SupportedLanguage

  function switchTo(lang: SupportedLanguage) {
    if (lang === current) return
    void i18n.changeLanguage(lang)
  }

  const containerStyles = variant === 'onDark'
    ? 'bg-white/10 border border-white/15'
    : 'bg-gray-100 border border-gray-200'

  const inactiveText = variant === 'onDark' ? 'text-white/60' : 'text-gray-500'

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={cn(
        'inline-flex items-center rounded-full p-0.5 select-none',
        containerStyles,
        className,
      )}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = current === lang
        return (
          <button
            key={lang}
            type="button"
            onClick={() => switchTo(lang)}
            aria-pressed={isActive}
            className={cn(
              'min-w-[40px] h-7 px-3 rounded-full text-xs font-semibold font-body transition-all duration-150',
              isActive
                ? 'bg-primary text-white shadow-sm'
                : `bg-transparent ${inactiveText} hover:text-current`,
            )}
          >
            {LABELS[lang]}
          </button>
        )
      })}
    </div>
  )
}
