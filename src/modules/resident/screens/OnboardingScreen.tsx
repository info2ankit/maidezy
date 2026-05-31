import { useState, useEffect } from 'react'
import {
  ArrowRight,
  MapPin,
  Buildings,
  CaretLeft,
  Check,
  SpinnerGap,
  User,
} from '@phosphor-icons/react'
import Logo from '@/shared/components/Logo'
import { fetchSocieties } from '@/shared/services/societyService'
import { normalizeForSearch } from '@/shared/utils/normalizeSearch'
import { createResidentProfile } from '../services/residentPortalService'
import { useResidentStore } from '../stores/residentStore'
import { useAuthStore } from '@/shared/stores/authStore'
import { supabase } from '@/lib/supabase'
import type { Society } from '@/shared/types'

interface Props {
  onComplete: () => void
}

const TOTAL_STEPS = 5

function ProgressDots({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === active
              ? 'w-6 h-2 bg-accent'
              : 'w-2 h-2 bg-white/30'
          }`}
        />
      ))}
    </div>
  )
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { user, setUser } = useAuthStore()
  const { setResident } = useResidentStore()

  const [step, setStep] = useState(0)

  // Step 1 — Name
  const [name, setName] = useState(user?.name ?? '')

  // Step 2 — Location
  const [detecting, setDetecting] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [detectedCity, setDetectedCity] = useState('')
  const [detectedState, setDetectedState] = useState('')
  const [detectedPincode, setDetectedPincode] = useState('')
  const [detectedNeighbourhood, setDetectedNeighbourhood] = useState('')
  const [manualPincode, setManualPincode] = useState('')

  // Step 3 — Society
  const [societies, setSocieties] = useState<Society[]>([])
  const [societiesLoading, setSocietiesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSocietyId, setSelectedSocietyId] = useState('')

  // Step 4 — Address
  const [flatNo, setFlatNo] = useState('')
  const [block, setBlock] = useState('')
  const [pincode, setPincode] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Load societies when step 3 is reached
  useEffect(() => {
    if (step !== 3) return
    setSocietiesLoading(true)
    fetchSocieties()
      .then((data) => setSocieties(data))
      .catch(() => setSocieties([]))
      .finally(() => setSocietiesLoading(false))
  }, [step])

  // When entering society step, pre-populate search from detected neighbourhood
  useEffect(() => {
    if (step === 3 && detectedNeighbourhood) {
      setSearchQuery(detectedNeighbourhood)
    }
  }, [step, detectedNeighbourhood])

  // Pre-fill pincode in step 4
  useEffect(() => {
    if (step === 4) {
      setPincode(detectedPincode || manualPincode)
    }
  }, [step, detectedPincode, manualPincode])

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }
    setDetecting(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'User-Agent': 'MaidEzy/1.0' } },
          )
          const json = await res.json()
          const addr = json.address ?? {}
          setDetectedCity(addr.city ?? addr.town ?? addr.village ?? '')
          setDetectedState(addr.state ?? '')
          setDetectedPincode(addr.postcode ?? '')
          // Try to extract a neighbourhood/society-like name for pre-filling society search
          const neighbourhood =
            addr.neighbourhood ??
            addr.suburb ??
            addr.residential ??
            addr.hamlet ??
            ''
          setDetectedNeighbourhood(neighbourhood)
        } catch {
          setLocationError('Could not fetch location details. Please enter pincode manually.')
        } finally {
          setDetecting(false)
        }
      },
      (err) => {
        setDetecting(false)
        if (err.code === 1) {
          setLocationError('Location access denied. Please enter your pincode manually.')
        } else {
          setLocationError('Could not determine your location. Please enter pincode manually.')
        }
      },
      { timeout: 10000 },
    )
  }

  const filteredSocieties = societies.filter((s) => {
    const matchesCity =
      !detectedCity ||
      s.city.toLowerCase().includes(detectedCity.toLowerCase()) ||
      detectedCity.toLowerCase().includes(s.city.toLowerCase())
    const q = normalizeForSearch(searchQuery)
    const matchesSearch =
      !searchQuery ||
      normalizeForSearch(s.name).includes(q) ||
      normalizeForSearch(s.city).includes(q)
    return matchesCity && matchesSearch
  })

  async function handleComplete() {
    if (!user || !selectedSocietyId || !flatNo.trim()) return
    setIsSaving(true)
    setSaveError('')
    try {
      // Save name to users table
      const trimmedName = name.trim()
      if (trimmedName) {
        const { error: nameErr } = await supabase
          .from('users')
          .update({ name: trimmedName })
          .eq('id', user.id)
        if (nameErr) throw new Error(nameErr.message)
        setUser({ ...user, name: trimmedName })
      }

      const resident = await createResidentProfile(
        user.id,
        selectedSocietyId,
        flatNo.trim(),
        block.trim() || null,
      )
      setResident(resident)
      onComplete()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Setup failed. Please try again.')
      setIsSaving(false)
    }
  }

  const locationDetected = !!(detectedCity && detectedPincode)

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">

      {/* ── Step 0: Welcome ─────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex flex-col transition-all duration-500 ${
          step === 0 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex-1 bg-gradient-to-b from-primary to-[#0f2340] flex flex-col items-center justify-center px-8 text-center">
          <div className="bg-white rounded-3xl p-6 mb-6 shadow-2xl">
            <Logo height={120} />
          </div>
          <p className="font-body text-white/60 text-sm leading-relaxed max-w-xs">
            Book verified home workers in your society — maids, cooks, drivers and more.
          </p>
        </div>

        <div className="bg-gradient-to-b from-primary to-[#0f2340] px-8 pb-12 flex flex-col items-center gap-6">
          <button
            onClick={() => setStep(1)}
            className="w-full max-w-xs bg-white text-primary font-heading font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base shadow-lg active:scale-95 transition-all"
          >
            Get Started
            <ArrowRight size={20} weight="bold" />
          </button>
          <ProgressDots total={TOTAL_STEPS} active={0} />
        </div>
      </div>

      {/* ── Step 1: Your Name ────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 bg-white flex flex-col transition-all duration-500 ${
          step === 1 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-5 pt-12 pb-4 flex items-center gap-3">
          <button
            onClick={() => setStep(0)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <CaretLeft size={18} weight="bold" className="text-gray-600" />
          </button>
          <div className="flex-1" />
          <ProgressDots total={TOTAL_STEPS} active={1} />
        </div>

        <div className="flex-1 px-6 pt-6 overflow-y-auto">
          <div className="flex items-center justify-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <User size={48} weight="duotone" className="text-primary" />
            </div>
          </div>

          <h2 className="font-heading font-bold text-2xl text-gray-800 mb-1">
            What's your name?
          </h2>
          <p className="font-body text-gray-500 text-sm mb-8">
            So workers know who they're working for
          </p>

          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="input-field"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim().length >= 2) setStep(2)
              }}
            />
          </div>
        </div>

        <div className="px-6 pb-8">
          <button
            onClick={() => setStep(2)}
            disabled={name.trim().length < 2}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── Step 2: Location Detection ──────────────────────────────── */}
      <div
        className={`absolute inset-0 bg-white flex flex-col transition-all duration-500 ${
          step === 2 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-5 pt-12 pb-4 flex items-center gap-3">
          <button
            onClick={() => setStep(1)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <CaretLeft size={18} weight="bold" className="text-gray-600" />
          </button>
          <div className="flex-1" />
          <ProgressDots total={TOTAL_STEPS} active={2} />
        </div>

        <div className="flex-1 px-6 pt-4 overflow-y-auto">
          <h2 className="font-heading font-bold text-2xl text-gray-800 mb-1">
            Where do you live?
          </h2>
          <p className="font-body text-gray-500 text-sm mb-10">
            We'll find workers in your society
          </p>

          {/* Animated pin */}
          <div className="flex items-center justify-center mb-10">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-full bg-accent/10 animate-ping" />
              <div className="absolute w-16 h-16 rounded-full bg-accent/20 animate-ping animation-delay-150" />
              <MapPin size={56} weight="duotone" className="relative z-10 text-accent" />
            </div>
          </div>

          {!locationDetected && !locationError && (
            <button
              onClick={detectLocation}
              disabled={detecting}
              className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
            >
              {detecting ? (
                <>
                  <SpinnerGap size={18} weight="bold" className="animate-spin" />
                  Detecting location…
                </>
              ) : (
                '🎯 Detect My Location'
              )}
            </button>
          )}

          {locationDetected && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check size={14} weight="bold" className="text-white" />
                </div>
                <span className="font-body font-semibold text-green-800 text-sm">
                  Location Detected
                </span>
              </div>
              <p className="font-body text-green-700 text-sm">
                {[detectedNeighbourhood, detectedCity, detectedState, detectedPincode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}

          {locationError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
              <p className="font-body text-red-700 text-sm mb-3">{locationError}</p>
              <button
                onClick={detectLocation}
                disabled={detecting}
                className="btn-primary w-full text-sm py-2.5 mb-3 flex items-center justify-center gap-2"
              >
                {detecting ? (
                  <SpinnerGap size={16} weight="bold" className="animate-spin" />
                ) : null}
                Try Again
              </button>
              <p className="font-body text-gray-500 text-xs mb-2">Or enter your pincode manually:</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={manualPincode}
                onChange={(e) => setManualPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit pincode"
                className="input-field"
              />
            </div>
          )}
        </div>

        <div className="px-6 pb-8">
          <button
            onClick={() => setStep(3)}
            disabled={!locationDetected && manualPincode.length < 6}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── Step 3: Society Picker ───────────────────────────────────── */}
      <div
        className={`absolute inset-0 bg-white flex flex-col transition-all duration-500 ${
          step === 3 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-5 pt-12 pb-4 flex items-center gap-3">
          <button
            onClick={() => setStep(2)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <CaretLeft size={18} weight="bold" className="text-gray-600" />
          </button>
          <div className="flex-1" />
          <ProgressDots total={TOTAL_STEPS} active={3} />
        </div>

        <div className="px-6 pb-3">
          <h2 className="font-heading font-bold text-2xl text-gray-800 mb-1">Your Society</h2>
          <p className="font-body text-gray-500 text-sm mb-4">
            {detectedCity ? `Showing societies near ${detectedCity}` : 'All available societies'}
          </p>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search society…"
            className="input-field"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
          {societiesLoading ? (
            <div className="flex justify-center py-12">
              <SpinnerGap size={32} weight="bold" className="animate-spin text-primary" />
            </div>
          ) : filteredSocieties.length === 0 ? (
            <div className="text-center py-12">
              <Buildings size={44} weight="duotone" className="text-gray-300 mx-auto mb-3" />
              <p className="font-body text-gray-500 font-semibold">No societies found</p>
              <p className="font-body text-gray-400 text-sm mt-1">
                Try a different search
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 font-body text-primary text-sm font-medium underline"
                >
                  Show all societies
                </button>
              )}
            </div>
          ) : (
            filteredSocieties.map((society) => {
              const isSelected = selectedSocietyId === society.id
              return (
                <button
                  key={society.id}
                  onClick={() => setSelectedSocietyId(society.id)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 flex items-center gap-3 ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary/10' : 'bg-gray-100'
                    }`}
                  >
                    <Buildings
                      size={20}
                      weight="duotone"
                      className={isSelected ? 'text-primary' : 'text-gray-400'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-gray-800 text-sm leading-snug truncate">
                      {society.name}
                    </p>
                    <p className="font-body text-xs text-gray-400 mt-0.5">
                      {society.city}, {society.state}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shrink-0">
                      <Check size={12} weight="bold" className="text-white" />
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="px-6 pb-8">
          <button
            onClick={() => setStep(4)}
            disabled={!selectedSocietyId}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── Step 4: Flat Details ─────────────────────────────────────── */}
      <div
        className={`absolute inset-0 bg-white flex flex-col transition-all duration-500 ${
          step === 4 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-5 pt-12 pb-4 flex items-center gap-3">
          <button
            onClick={() => setStep(3)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <CaretLeft size={18} weight="bold" className="text-gray-600" />
          </button>
          <div className="flex-1" />
          <ProgressDots total={TOTAL_STEPS} active={4} />
        </div>

        <div className="flex-1 px-6 pt-2 overflow-y-auto">
          <h2 className="font-heading font-bold text-2xl text-gray-800 mb-1">
            Your flat details
          </h2>
          <p className="font-body text-gray-500 text-sm mb-8">
            Help workers find you easily
          </p>

          <div className="space-y-4">
            <div>
              <label className="label">Flat / House No. *</label>
              <input
                type="text"
                value={flatNo}
                onChange={(e) => setFlatNo(e.target.value)}
                placeholder="e.g. 301, A-12"
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Block / Wing (optional)</label>
              <input
                type="text"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                placeholder="e.g. Block A, Tower B"
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit pincode"
                className="input-field"
              />
            </div>
          </div>

          {saveError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="font-body text-red-700 text-sm">{saveError}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-8">
          <button
            onClick={handleComplete}
            disabled={!flatNo.trim() || isSaving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <SpinnerGap size={18} weight="bold" className="animate-spin" />
                Setting up…
              </>
            ) : (
              'Complete Setup 🎉'
            )}
          </button>
        </div>
      </div>

    </div>
  )
}
