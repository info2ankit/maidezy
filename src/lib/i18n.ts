import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import hiCommon   from '@/locales/hi/common.json'
import hiAuth     from '@/locales/hi/auth.json'
import hiWorker   from '@/locales/hi/worker.json'
import hiResident from '@/locales/hi/resident.json'
import hiAdmin    from '@/locales/hi/admin.json'

import enCommon   from '@/locales/en/common.json'
import enAuth     from '@/locales/en/auth.json'
import enWorker   from '@/locales/en/worker.json'
import enResident from '@/locales/en/resident.json'
import enAdmin    from '@/locales/en/admin.json'

export const SUPPORTED_LANGUAGES = ['hi', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANG_STORAGE_KEY = 'maidezy_lang'

const resources = {
  hi: { common: hiCommon, auth: hiAuth, worker: hiWorker, resident: hiResident, admin: hiAdmin },
  en: { common: enCommon, auth: enAuth, worker: enWorker, resident: enResident, admin: enAdmin },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    defaultNS: 'common',
    ns: ['common', 'auth', 'worker', 'resident', 'admin'],
    interpolation: { escapeValue: false }, // React handles XSS
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
    // First-time visitors get Hindi unless their browser is explicitly English
    load: 'languageOnly',
  })

// Default to Hindi on first visit if nothing matched our supported list
if (!SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)) {
  void i18n.changeLanguage('hi')
}

export default i18n
