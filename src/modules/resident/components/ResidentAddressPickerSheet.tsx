import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Buildings, MapPin, SpinnerGap, CaretRight, Check, PlusCircle } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { backdropVariants, SPRING } from '@/shared/utils/motion'
import { fetchSavedAddresses } from '@/shared/services/residentAddressService'
import type { Resident, Society, ResidentSavedAddress } from '@/shared/types'

const sheetVariants = {
  hidden: { y: '100%' },
  show:   { y: 0,      transition: { type: 'spring' as const, stiffness: 360, damping: 36 } },
  exit:   { y: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
}

interface Props {
  resident: Resident
  homeSociety: Society | null
  activeAddress: ResidentSavedAddress | null  // null = currently at home
  onSelect: (addr: ResidentSavedAddress | null) => void  // null = switch to home
  onAddNew: () => void
  onClose: () => void
}

export default function ResidentAddressPickerSheet({
  resident, homeSociety, activeAddress, onSelect, onAddNew, onClose,
}: Props) {
  const [open, setOpen] = useState(true)
  const [addresses, setAddresses] = useState<ResidentSavedAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingAddNew, setPendingAddNew] = useState(false)

  useEffect(() => {
    fetchSavedAddresses(resident.id)
      .then((all) => setAddresses(all.filter((a) => !!a.society_id && !!a.flat_no)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [resident.id])

  const isHomeActive = activeAddress === null

  function handleSelect(addr: ResidentSavedAddress | null) {
    onSelect(addr)
    setOpen(false)
  }

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="addrpick-backdrop"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden" animate="show" exit="exit"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={() => {
        if (pendingAddNew) onAddNew()
        else onClose()
      }}>
        {open && (
          <motion.div
            key="addrpick-sheet"
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
            variants={sheetVariants}
            initial="hidden" animate="show" exit="exit"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0 border-b border-gray-100">
              <div>
                <h2 className="font-heading font-bold text-gray-900 text-lg">
                  Where are you booking for?
                </h2>
                <p className="font-body text-xs text-gray-400 mt-0.5">
                  Pick the address — the maid will come here
                </p>
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

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">

              {/* ── Home address (always first) ── */}
              <motion.button
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-left border transition-colors ${
                  isHomeActive
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-gray-50 border-transparent hover:border-gray-200 hover:bg-gray-100'
                }`}
                whileTap={{ scale: 0.98 }}
                transition={SPRING}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isHomeActive ? 'bg-primary/10' : 'bg-gray-200'
                }`}>
                  <Buildings
                    size={18}
                    weight="duotone"
                    className={isHomeActive ? 'text-primary' : 'text-gray-500'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-body font-semibold text-gray-800 text-sm truncate">
                      {homeSociety?.name ?? 'Your society'}
                    </p>
                    <span className="font-body text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full leading-none shrink-0">
                      Home
                    </span>
                  </div>
                  <p className="font-body text-xs text-gray-400 mt-0.5">
                    {resident.block ? `${resident.block}-` : ''}{resident.flat_no ?? '—'}
                    {homeSociety ? ` · ${homeSociety.city}` : ''}
                  </p>
                </div>
                {isHomeActive
                  ? <Check size={16} weight="bold" className="text-primary shrink-0" />
                  : <CaretRight size={14} weight="bold" className="text-gray-300 shrink-0" />
                }
              </motion.button>

              {/* ── Saved addresses ── */}
              {loading ? (
                <div className="flex justify-center py-6">
                  <SpinnerGap size={22} weight="bold" className="animate-spin text-primary" />
                </div>
              ) : (
                addresses.map((addr) => {
                  const isActive = activeAddress?.id === addr.id
                  return (
                    <motion.button
                      key={addr.id}
                      onClick={() => handleSelect(addr)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-left border transition-colors ${
                        isActive
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-gray-50 border-transparent hover:border-gray-200 hover:bg-gray-100'
                      }`}
                      whileTap={{ scale: 0.98 }}
                      transition={SPRING}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-primary/10' : 'bg-gray-200'
                      }`}>
                        <MapPin
                          size={18}
                          weight="duotone"
                          className={isActive ? 'text-primary' : 'text-gray-500'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-body font-semibold text-gray-800 text-sm truncate">
                            {addr.society_name}
                          </p>
                          {addr.address_type === 'previous_home' && (
                            <span className="font-body text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full leading-none shrink-0">
                              Prev home
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs text-gray-400 mt-0.5">
                          {addr.block ? `${addr.block}-` : ''}{addr.flat_no} · {addr.city}
                        </p>
                      </div>
                      {isActive
                        ? <Check size={16} weight="bold" className="text-primary shrink-0" />
                        : <CaretRight size={14} weight="bold" className="text-gray-300 shrink-0" />
                      }
                    </motion.button>
                  )
                })
              )}

              {/* ── Add new address ── */}
              <motion.button
                onClick={() => { setPendingAddNew(true); setOpen(false) }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-primary/30 hover:bg-primary/5 transition-colors"
                whileTap={{ scale: 0.98 }}
                transition={SPRING}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  <PlusCircle size={18} weight="duotone" className="text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-body text-sm font-semibold text-primary">Add a new address</p>
                  <p className="font-body text-xs text-gray-400 mt-0.5">Browse a different society</p>
                </div>
                <CaretRight size={14} weight="bold" className="text-primary/40 shrink-0" />
              </motion.button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}
