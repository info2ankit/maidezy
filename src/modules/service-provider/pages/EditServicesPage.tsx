import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/shared/stores/authStore'
import { useProvider } from '../components/ProviderContext'
import { saveWorkerServices, saveWorkerPricing } from '@/shared/services/workerProfileService'
import { SERVICE_TYPES } from '@/shared/constants/serviceTypes'
import { PRICING_DEFAULTS } from '@/shared/constants/pricingDefaults'
import ServiceCard from '../components/ServiceCard'
import PricingInputCard from '../components/PricingInputCard'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import type { ServiceTypeId } from '@/shared/constants/serviceTypes'

type PricingMap = Record<string, { monthly: number; perVisit: number }>

export default function EditServicesPage() {
  const { t } = useTranslation('worker')
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { refresh } = useProvider()

  const [step, setStep]       = useState<1 | 2>(1)
  const [selected, setSelected] = useState<ServiceTypeId[]>([])
  const [pricing, setPricing]   = useState<PricingMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving]   = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('worker_service_pricing')
      .select('service_type_id, monthly_rate, per_visit_rate')
      .eq('worker_id', user.id)
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return
        setSelected(data.map((r) => r.service_type_id as ServiceTypeId))
        const p: PricingMap = {}
        data.forEach((r) => {
          p[r.service_type_id] = {
            monthly:  r.monthly_rate  ?? 0,
            perVisit: r.per_visit_rate ?? 0,
          }
        })
        setPricing(p)
      })
      .then(() => setIsLoading(false), () => setIsLoading(false))
  }, [user])

  function toggleService(id: ServiceTypeId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function updatePrice(id: ServiceTypeId, mode: 'monthly' | 'perVisit', value: number) {
    setPricing((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? PRICING_DEFAULTS[id]), [mode]: value },
    }))
  }

  async function handleSave() {
    if (!user) return
    setIsSaving(true)
    setError(null)
    try {
      const finalPricing = Object.fromEntries(
        selected.map((id) => [id, pricing[id] ?? PRICING_DEFAULTS[id]]),
      ) as Record<ServiceTypeId, { monthly: number; perVisit: number }>

      await saveWorkerServices(user.id, selected)
      await saveWorkerPricing(user.id, finalPricing)
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
          onClick={() => (step === 2 ? setStep(1) : navigate('/provider/profile'))}
          className="w-9 h-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-800">
            {step === 1 ? t('profile.services_title') : t('profile.pricing_title')}
          </h1>
          <p className="font-body text-sm text-gray-400 mt-0.5">
            {step === 1 ? t('profile.services_subtitle') : t('profile.pricing_subtitle')}
          </p>
        </div>
      </div>

      {step === 1 ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {SERVICE_TYPES.map((service) => (
              <ServiceCard
                key={service.id}
                serviceTypeId={service.id}
                isSelected={selected.includes(service.id)}
                onToggle={() => toggleService(service.id)}
              />
            ))}
          </div>

          {selected.length > 0 && (
            <p className="text-center font-body text-sm text-accent font-semibold mb-4">
              {selected.length === 1
                ? t('profile.selected_count_one')
                : t('profile.selected_count_many', { count: selected.length })}
            </p>
          )}

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={selected.length === 0}
            className="w-full h-12 rounded-2xl bg-primary text-white font-heading font-bold text-sm disabled:opacity-40 transition-opacity"
          >
            {t('profile.next')}
          </button>
        </>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {selected.map((id) => {
              const p = pricing[id] ?? PRICING_DEFAULTS[id]
              return (
                <PricingInputCard
                  key={id}
                  serviceTypeId={id}
                  monthlyRate={p.monthly}
                  perVisitRate={p.perVisit}
                  onChange={(mode, value) => updatePrice(id, mode, value)}
                />
              )
            })}
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
        </>
      )}
    </div>
  )
}
