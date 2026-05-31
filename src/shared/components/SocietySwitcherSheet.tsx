import { useState, useEffect, useMemo } from 'react'
import {
  X, MagnifyingGlass, Buildings, Check, SpinnerGap, PlusCircle,
  ArrowLeft, CheckCircle, MapPin, CaretRight,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { SPRING, backdropVariants } from '@/shared/utils/motion'
import { supabase } from '@/lib/supabase'
import { fetchSocieties } from '@/shared/services/societyService'
import { submitSocietyRequest } from '@/shared/services/societyRequestService'
import { normalizeForSearch } from '@/shared/utils/normalizeSearch'
import type { Society } from '@/shared/types'

const sheetVariants = {
  hidden: { y: '100%' },
  show:   { y: 0, transition: { type: 'spring' as const, stiffness: 360, damping: 36 } },
  exit:   { y: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
}

type Step = 'city' | 'list' | 'address' | 'request' | 'success'

interface Props {
  mode: 'browse' | 'change'
  userId: string
  residentId: string
  currentCity?: string
  onSelect: (society: Society, address?: { flatNo: string; block: string }) => void
  onClose: () => void
}

export default function SocietySwitcherSheet({
  mode, userId, residentId, currentCity, onSelect, onClose,
}: Props) {
  const [open, setOpen] = useState(true)
  const [step, setStep] = useState<Step>('city')

  // Step 1 — city
  const [cityInput, setCityInput] = useState(currentCity ?? '')

  // Step 2 — society list
  const [societies, setSocieties] = useState<Society[]>([])
  const [loadingSocieties, setLoadingSocieties] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeSocietyIds, setActiveSocietyIds] = useState<Set<string>>(new Set())

  // Step 3A — address (change mode, existing society selected)
  const [selectedSociety, setSelectedSociety] = useState<Society | null>(null)
  const [flatNo, setFlatNo] = useState('')
  const [block, setBlock] = useState('')

  // Step 3B — request new society
  const [reqName, setReqName] = useState('')
  const [reqPincode, setReqPincode] = useState('')
  const [reqFlatNo, setReqFlatNo] = useState('')
  const [reqBlock, setReqBlock] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [addressSaved, setAddressSaved] = useState(false)

  useEffect(() => {
    if (step !== 'list') return
    setLoadingSocieties(true)
    setLoadError(null)
    async function load() {
      try {
        const [allSocieties, providersRes] = await Promise.all([
          fetchSocieties(),
          supabase.from('service_providers').select('society_id, society_ids'),
        ])
        setSocieties(allSocieties)
        const ids = new Set<string>()
        for (const p of providersRes.data ?? []) {
          if (p.society_id) ids.add(p.society_id)
          for (const id of (p.society_ids as string[] | null) ?? []) ids.add(id)
        }
        setActiveSocietyIds(ids)
      } catch (e) {
        setLoadError((e as Error).message)
      } finally {
        setLoadingSocieties(false)
      }
    }
    load()
  }, [step])

  const filtered = useMemo(() => {
    const cityNorm = normalizeForSearch(cityInput.trim())
    const base = societies.filter((s) => {
      if (activeSocietyIds.size > 0 && !activeSocietyIds.has(s.id)) return false
      if (cityNorm && !normalizeForSearch(s.city).includes(cityNorm)) return false
      return true
    })
    const q = normalizeForSearch(query.trim())
    if (!q) return base
    return base.filter((s) =>
      normalizeForSearch(s.name).includes(q) ||
      (s.pincode ?? '').includes(q),
    )
  }, [societies, activeSocietyIds, cityInput, query])

  function goToList() {
    setQuery('')
    setStep('list')
  }

  function handleSelectSociety(society: Society) {
    setSelectedSociety(society)
    setFlatNo('')
    setBlock('')
    setStep('address')
  }

  function handleConfirmAddress() {
    if (!selectedSociety || !flatNo.trim()) return
    onSelect(selectedSociety, { flatNo: flatNo.trim(), block: block.trim() })
    setOpen(false)
  }

  function openRequestForm() {
    setReqName(query.trim())
    setReqPincode('')
    setReqFlatNo('')
    setReqBlock('')
    setSubmitError(null)
    setStep('request')
  }

  async function handleSubmitRequest() {
    if (!reqName.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    const hasAddress = reqFlatNo.trim().length > 0
    try {
      await submitSocietyRequest({
        requestedBy: userId,
        name:        reqName,
        city:        cityInput,
        pincode:     reqPincode,
        residentId:  residentId || undefined,
        flatNo:      reqFlatNo,
        block:       reqBlock,
      })
      setAddressSaved(hasAddress)
      setStep('success')
    } catch (e) {
      setSubmitError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    switch (step) {
      case 'list':    setStep('city'); break
      case 'address': setStep('list'); break
      case 'request': setStep('list'); break
    }
  }

  // Step indicator: always 3 steps (city → society → address)
  const totalDots = 3
  const filledDots = step === 'city' ? 1 : step === 'list' ? 2 : 3

  const showBack = step === 'list' || step === 'address' || step === 'request'

  function headerTitle() {
    switch (step) {
      case 'city':    return mode === 'change' ? 'Change My Society' : 'Browse Another Society'
      case 'list':    return 'Select Society'
      case 'address': return 'Your Address'
      case 'request': return 'Request New Society'
      case 'success': return 'Request Sent!'
    }
  }

  function headerSubtitle(): string | undefined {
    switch (step) {
      case 'city':    return mode === 'change' ? 'Update your registered society' : 'Find workers for any society'
      case 'list':    return cityInput.trim() ? `Showing in ${cityInput.trim()}` : 'All societies'
      case 'address': return selectedSociety ? `${selectedSociety.name} · ${selectedSociety.city}` : undefined
      default:        return undefined
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="switcher-backdrop"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={onClose}>
        {open && (
          <motion.div
            key="switcher-sheet"
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            variants={sheetVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {showBack && (
                  <motion.button
                    onClick={handleBack}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-1"
                    whileTap={{ scale: 0.88 }}
                    transition={SPRING}
                  >
                    <ArrowLeft size={15} weight="bold" className="text-gray-500" />
                  </motion.button>
                )}
                <div>
                  <h2 className="font-heading font-bold text-gray-900 text-lg leading-tight">
                    {headerTitle()}
                  </h2>
                  {headerSubtitle() && (
                    <p className="font-body text-xs text-gray-400 mt-0.5">{headerSubtitle()}</p>
                  )}
                </div>
              </div>
              <motion.button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                whileTap={{ scale: 0.88, rotate: 90 }}
                transition={SPRING}
              >
                <X size={16} weight="bold" className="text-gray-500" />
              </motion.button>
            </div>

            {/* Step dots */}
            {step !== 'success' && (
              <div className="flex items-center justify-center gap-1.5 pt-3 pb-1 shrink-0">
                {Array.from({ length: totalDots }, (_, i) => (
                  <motion.div
                    key={i}
                    animate={{ width: i < filledDots ? 24 : 6, backgroundColor: i < filledDots ? 'var(--color-primary, #1a3a5c)' : '#e5e7eb' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="h-1.5 rounded-full"
                  />
                ))}
              </div>
            )}

            {/* Body — step transitions */}
            <AnimatePresence mode="wait">

              {/* ── Step 1: City ── */}
              {step === 'city' && (
                <motion.div
                  key="step-city"
                  className="flex-1 overflow-y-auto px-5 pt-5 pb-8 flex flex-col gap-5"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={SPRING}
                >
                  <p className="font-body text-sm text-gray-500">
                    {mode === 'change'
                      ? 'First, which city is your new society in?'
                      : 'Which city would you like to browse workers in?'}
                  </p>

                  <div>
                    <label className="font-body text-xs font-semibold text-gray-500 mb-1.5 block">City *</label>
                    <input
                      type="text"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="e.g. Noida, Delhi, Mumbai…"
                      autoFocus
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 font-body text-sm text-gray-800 outline-none focus:border-primary"
                      onKeyDown={(e) => { if (e.key === 'Enter' && cityInput.trim()) goToList() }}
                    />
                  </div>

                  <motion.button
                    onClick={goToList}
                    disabled={!cityInput.trim()}
                    className="w-full bg-primary text-white font-body font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING}
                  >
                    Find Societies in {cityInput.trim() || '…'}
                    <CaretRight size={15} weight="bold" />
                  </motion.button>

                  <button
                    onClick={goToList}
                    className="font-body text-xs text-gray-400 text-center -mt-2 hover:text-gray-500 transition-colors"
                  >
                    Skip — show all cities
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Society list ── */}
              {step === 'list' && (
                <motion.div
                  key="step-list"
                  className="flex-1 flex flex-col overflow-hidden"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={SPRING}
                >
                  <div className="px-5 py-3 shrink-0">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                      <MagnifyingGlass size={17} weight="regular" className="text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by society name…"
                        autoFocus
                        className="flex-1 min-w-0 font-body text-sm text-gray-700 placeholder:text-gray-400 bg-transparent outline-none"
                      />
                      <AnimatePresence>
                        {query && (
                          <motion.button
                            onClick={() => setQuery('')}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={SPRING}
                          >
                            <X size={14} weight="bold" className="text-gray-400" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
                    {loadingSocieties ? (
                      <div className="flex justify-center py-12">
                        <SpinnerGap size={28} weight="bold" className="animate-spin text-primary" />
                      </div>
                    ) : loadError ? (
                      <p className="font-body text-sm text-red-500 text-center py-8">{loadError}</p>
                    ) : filtered.length > 0 ? (
                      <>
                        {filtered.map((society) => (
                          <motion.button
                            key={society.id}
                            onClick={() => handleSelectSociety(society)}
                            className="w-full flex items-center gap-3 p-3.5 bg-gray-50 hover:bg-primary/5 rounded-2xl transition-colors text-left border border-transparent hover:border-primary/20"
                            whileTap={{ scale: 0.98 }}
                            transition={SPRING}
                          >
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                              <Buildings size={18} weight="duotone" className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-body font-semibold text-gray-800 text-sm truncate">{society.name}</p>
                              <p className="font-body text-xs text-gray-400 mt-0.5">{society.city}, {society.state}</p>
                            </div>
                            <CaretRight size={14} weight="bold" className="text-gray-300 shrink-0" />
                          </motion.button>
                        ))}
                        <div className="pt-2">
                          <button
                            onClick={openRequestForm}
                            className="w-full flex items-center gap-2 p-3.5 rounded-2xl border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                          >
                            <PlusCircle size={16} weight="fill" className="shrink-0" />
                            <span className="font-body text-sm font-semibold">
                              Don't see your society? Request to add
                            </span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <motion.div
                        className="flex flex-col items-center pt-10 pb-4 gap-3"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={SPRING}
                      >
                        <Buildings size={44} weight="duotone" className="text-gray-300" />
                        <div className="text-center">
                          <p className="font-body font-semibold text-gray-500 text-sm">No societies found</p>
                          <p className="font-body text-xs text-gray-400 mt-0.5">
                            {cityInput.trim() ? `No results in ${cityInput.trim()}` : 'Try a different name'}
                          </p>
                        </div>
                        <motion.button
                          onClick={openRequestForm}
                          className="mt-1 inline-flex items-center gap-2 bg-primary/8 text-primary font-body font-semibold text-sm px-5 py-3 rounded-2xl"
                          whileTap={{ scale: 0.96 }}
                          transition={SPRING}
                        >
                          <PlusCircle size={16} weight="fill" />
                          Request to add {query ? `"${query}"` : 'your society'}
                        </motion.button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Step 3A: Address entry (change mode) ── */}
              {step === 'address' && (
                <motion.div
                  key="step-address"
                  className="flex-1 overflow-y-auto px-5 pt-5 pb-8 flex flex-col gap-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={SPRING}
                >
                  {/* Selected society summary */}
                  <div className="bg-primary/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-primary/20 flex items-center justify-center shrink-0">
                      <Buildings size={18} weight="duotone" className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-semibold text-gray-800 text-sm truncate">{selectedSociety?.name}</p>
                      <p className="font-body text-xs text-gray-400">{selectedSociety?.city}, {selectedSociety?.state}</p>
                    </div>
                    <Check size={16} weight="bold" className="text-primary shrink-0" />
                  </div>

                  <p className="font-body text-sm text-gray-500">
                    {mode === 'change'
                      ? 'Where exactly are you in this society? Your workers will use this to find you.'
                      : 'What is your address here? The maid needs this to reach you.'}
                  </p>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="font-body text-xs font-semibold text-gray-500 mb-1.5 block">Flat / Unit No *</label>
                      <input
                        type="text"
                        value={flatNo}
                        onChange={(e) => setFlatNo(e.target.value)}
                        placeholder="e.g. 204"
                        autoFocus
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 font-body text-sm text-gray-800 outline-none focus:border-primary"
                        onKeyDown={(e) => { if (e.key === 'Enter' && flatNo.trim()) handleConfirmAddress() }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="font-body text-xs font-semibold text-gray-500 mb-1.5 block">Block / Tower</label>
                      <input
                        type="text"
                        value={block}
                        onChange={(e) => setBlock(e.target.value)}
                        placeholder="e.g. B"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 font-body text-sm text-gray-800 outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <motion.button
                    onClick={handleConfirmAddress}
                    disabled={!flatNo.trim()}
                    className="w-full bg-primary text-white font-body font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING}
                  >
                    <Check size={16} weight="bold" />
                    {mode === 'change' ? 'Set as My Society' : 'Use This Address'}
                  </motion.button>
                </motion.div>
              )}

              {/* ── Step 3B: Request new society ── */}
              {step === 'request' && (
                <motion.div
                  key="step-request"
                  className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={SPRING}
                >
                  <p className="font-body text-sm text-gray-500">
                    Society not in our system yet? Fill in the details and we'll get it added.
                  </p>

                  <div>
                    <label className="font-body text-xs font-semibold text-gray-500 mb-1 block">Society Name *</label>
                    <input
                      type="text"
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      placeholder="e.g. Sigma III"
                      autoFocus
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 font-body text-sm text-gray-800 outline-none focus:border-primary"
                    />
                  </div>

                  {/* City — locked from Step 1 */}
                  <div>
                    <label className="font-body text-xs font-semibold text-gray-500 mb-1 block">City</label>
                    <div className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 font-body text-sm text-gray-500 flex items-center gap-2">
                      <MapPin size={14} weight="duotone" className="text-primary/60 shrink-0" />
                      {cityInput.trim() || '—'}
                    </div>
                  </div>

                  <div>
                    <label className="font-body text-xs font-semibold text-gray-500 mb-1 block">Pincode (optional)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={reqPincode}
                      onChange={(e) => setReqPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit pincode"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 font-body text-sm text-gray-800 outline-none focus:border-primary"
                    />
                  </div>

                  {/* Address divider */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 h-px bg-gray-100" />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <MapPin size={13} weight="duotone" className="text-primary/60" />
                      <span className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Your Address There
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <p className="font-body text-xs text-gray-400 -mt-2">
                    Optional — saved to your profile for future reference
                  </p>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="font-body text-xs font-semibold text-gray-500 mb-1 block">Flat / Unit No</label>
                      <input
                        type="text"
                        value={reqFlatNo}
                        onChange={(e) => setReqFlatNo(e.target.value)}
                        placeholder="e.g. 204"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 font-body text-sm text-gray-800 outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="font-body text-xs font-semibold text-gray-500 mb-1 block">Block / Tower</label>
                      <input
                        type="text"
                        value={reqBlock}
                        onChange={(e) => setReqBlock(e.target.value)}
                        placeholder="e.g. B"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 font-body text-sm text-gray-800 outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {submitError && (
                    <p className="font-body text-sm text-red-600">{submitError}</p>
                  )}

                  <motion.button
                    onClick={handleSubmitRequest}
                    disabled={!reqName.trim() || submitting}
                    className="w-full bg-primary text-white font-body font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING}
                  >
                    {submitting && <SpinnerGap size={16} weight="bold" className="animate-spin" />}
                    Send Request
                  </motion.button>
                </motion.div>
              )}

              {/* ── Success ── */}
              {step === 'success' && (
                <motion.div
                  key="step-success"
                  className="flex-1 flex flex-col items-center justify-center px-8 pb-10 gap-4"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={SPRING}
                >
                  <motion.div
                    className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <CheckCircle size={48} weight="fill" className="text-emerald-500" />
                  </motion.div>
                  <div className="text-center">
                    <h3 className="font-heading font-bold text-gray-900 text-lg">Request Sent!</h3>
                    <p className="font-body text-sm text-gray-500 mt-1">
                      We'll review <span className="font-semibold text-gray-700">{reqName}</span> and add it soon.
                    </p>
                    {addressSaved && (
                      <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-body text-xs font-semibold px-3 py-1.5 rounded-full">
                        <MapPin size={13} weight="fill" />
                        Address saved to your profile
                      </div>
                    )}
                  </div>
                  <motion.button
                    onClick={() => setOpen(false)}
                    className="mt-2 px-6 py-3 bg-primary text-white font-body font-semibold rounded-2xl text-sm"
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING}
                  >
                    Done
                  </motion.button>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
