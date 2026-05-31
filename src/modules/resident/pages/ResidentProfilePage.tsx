import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Phone, Buildings, House, PencilSimple, Check, X, SpinnerGap,
  SignOut, MapPin, Calendar, ArrowsLeftRight, Trash, Plus,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { SPRING, staggerContainer, staggerItem } from '@/shared/utils/motion'
import { useAuthStore } from '@/shared/stores/authStore'
import { useResidentStore } from '../stores/residentStore'
import { signOut } from '@/shared/services/authService'
import { supabase } from '@/lib/supabase'
import { fetchSavedAddresses, deleteSavedAddress, saveSavedAddress } from '@/shared/services/residentAddressService'
import type { Society, ResidentSavedAddress } from '@/shared/types'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import SocietySwitcherSheet from '@/shared/components/SocietySwitcherSheet'

export default function ResidentProfilePage() {
  const navigate = useNavigate()
  const { user, setUser, logout }       = useAuthStore()
  const { resident, setResident, clearResident, activeAddress, setActiveAddress } = useResidentStore()

  const [society, setSociety]           = useState<Society | null>(null)
  const [isLoading, setIsLoading]       = useState(true)
  const [editingName, setEditingName]   = useState(false)
  const [nameValue, setNameValue]       = useState(user?.name ?? '')
  const [savingName, setSavingName]     = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut]     = useState(false)

  // Change home address flow
  const [showSocietySwitcher, setShowSocietySwitcher] = useState(false)
  const [changingSociety, setChangingSociety]         = useState(false)

  // Saved addresses
  const [savedAddresses, setSavedAddresses]       = useState<ResidentSavedAddress[]>([])
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null)
  const [confirmDeleteAddr, setConfirmDeleteAddr] = useState<ResidentSavedAddress | null>(null)

  // Add new address flow
  const [showAddAddressSheet, setShowAddAddressSheet] = useState(false)
  const [addingAddress, setAddingAddress]             = useState(false)

  useEffect(() => {
    async function load() {
      if (!resident?.society_id) { setIsLoading(false); return }
      try {
        const { data, error } = await supabase
          .from('societies')
          .select('*')
          .eq('id', resident.society_id)
          .maybeSingle()
        if (error) throw new Error(error.message)
        setSociety(data as Society | null)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [resident?.society_id])

  useEffect(() => {
    if (!resident?.id) return
    fetchSavedAddresses(resident.id)
      .then(setSavedAddresses)
      .catch(() => {})
  }, [resident?.id])

  async function saveName() {
    if (!user?.id || !nameValue.trim()) return
    setSavingName(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: nameValue.trim() })
        .eq('id', user.id)
      if (error) throw new Error(error.message)
      setUser({ ...user, name: nameValue.trim() })
      setEditingName(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingName(false)
    }
  }

  async function handleChangeSociety(newSociety: Society, address?: { flatNo: string; block: string }) {
    if (!resident) return
    setChangingSociety(true)
    setError(null)
    try {
      if (resident.flat_no && society) {
        await saveSavedAddress({
          residentId:  resident.id,
          label:       society.name,
          societyId:   society.id,
          societyName: society.name,
          addressType: 'previous_home',
          city:        society.city,
          flatNo:      resident.flat_no,
          block:       resident.block ?? undefined,
        }).catch(() => {})
      }
      const updates: Record<string, string | null> = { society_id: newSociety.id }
      if (address) {
        updates.flat_no = address.flatNo
        updates.block   = address.block || null
      }
      const { error: err } = await supabase
        .from('residents')
        .update(updates)
        .eq('id', resident.id)
      if (err) throw new Error(err.message)
      setResident({
        ...resident,
        society_id: newSociety.id,
        ...(address ? { flat_no: address.flatNo, block: address.block || null } : {}),
      })
      setSociety(newSociety)
      // If switching home, also reset active address to home
      setActiveAddress(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setChangingSociety(false)
      setShowSocietySwitcher(false)
      if (resident?.id) {
        fetchSavedAddresses(resident.id).then(setSavedAddresses).catch(() => {})
      }
    }
  }

  async function handleDeleteAddress(addr: ResidentSavedAddress) {
    setDeletingAddressId(addr.id)
    try {
      await deleteSavedAddress(addr.id)
      setSavedAddresses((prev) => prev.filter((a) => a.id !== addr.id))
      // Clear active address if the deleted one was active
      if (activeAddress?.id === addr.id) setActiveAddress(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDeletingAddressId(null)
      setConfirmDeleteAddr(null)
    }
  }

  async function handleAddAddress(newSociety: Society, address?: { flatNo: string; block: string }) {
    if (!resident?.id || !address) { setShowAddAddressSheet(false); return }
    setAddingAddress(true)
    try {
      const saved = await saveSavedAddress({
        residentId:  resident.id,
        label:       newSociety.name,
        societyId:   newSociety.id,
        societyName: newSociety.name,
        addressType: 'browse_visit',
        city:        newSociety.city,
        flatNo:      address.flatNo,
        block:       address.block,
      })
      setSavedAddresses((prev) => [saved, ...prev])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAddingAddress(false)
      setShowAddAddressSheet(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOut()
      clearResident()
      logout()
      navigate('/login', { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setLoggingOut(false)
    }
  }

  const initial = (user?.name ?? user?.mobile ?? 'U').charAt(0).toUpperCase()
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—'
  const isHomeActive = activeAddress === null

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      {/* Header gradient */}
      <motion.div
        className="bg-gradient-to-b from-primary to-[#2a4f7a] px-5 pt-8 pb-12 rounded-b-3xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      >
        <div className="flex flex-col items-center">
          <motion.div
            className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
          >
            <span className="font-heading font-bold text-white text-3xl">{initial}</span>
          </motion.div>

          <AnimatePresence mode="wait">
            {editingName ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRING}
                className="mt-3 flex items-center gap-2 w-full max-w-xs"
              >
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  autoFocus
                  className="flex-1 bg-white/20 backdrop-blur border border-white/30 rounded-xl px-3 py-2 text-white placeholder-white/60 font-body text-center outline-none focus:bg-white/25"
                  placeholder="Your name"
                />
                <button
                  onClick={saveName}
                  disabled={savingName || !nameValue.trim()}
                  className="w-9 h-9 rounded-xl bg-white text-primary flex items-center justify-center disabled:opacity-50"
                >
                  {savingName ? <SpinnerGap size={16} weight="bold" className="animate-spin" /> : <Check size={16} weight="bold" />}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameValue(user?.name ?? '') }}
                  className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center"
                >
                  <X size={16} weight="bold" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="display"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRING}
                className="mt-3 flex items-center gap-2"
              >
                <p className="font-heading font-bold text-white text-xl">
                  {user?.name ?? 'Add your name'}
                </p>
                <motion.button
                  onClick={() => setEditingName(true)}
                  className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                  whileTap={{ scale: 0.85, rotate: 15 }}
                  transition={SPRING}
                >
                  <PencilSimple size={12} weight="bold" className="text-white" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p
            className="font-body text-sm text-white/70 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            Resident
          </motion.p>
        </div>
      </motion.div>

      <motion.div
        className="px-4 -mt-6 space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 text-sm font-body text-danger-dark"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contact card */}
        <motion.div variants={staggerItem} className="card space-y-3">
          <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</p>
          <InfoRow
            icon={<Phone size={16} weight="duotone" className="text-primary" />}
            label="Mobile"
            value={`+91 ${user?.mobile ?? ''}`}
          />
        </motion.div>

        {/* ── Address Book ───────────────────────────────────────────── */}
        <motion.div variants={staggerItem} className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Address Book
            </p>
            <motion.button
              onClick={() => setShowAddAddressSheet(true)}
              disabled={addingAddress}
              className="inline-flex items-center gap-1 bg-primary/8 text-primary font-body font-semibold text-xs rounded-full px-3 py-1.5 disabled:opacity-50"
              whileTap={{ scale: 0.93 }}
              transition={SPRING}
            >
              {addingAddress
                ? <SpinnerGap size={11} weight="bold" className="animate-spin" />
                : <Plus size={11} weight="bold" />
              }
              Add
            </motion.button>
          </div>

          {/* Home address */}
          <div className={`rounded-2xl overflow-hidden border transition-colors ${
            isHomeActive ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-transparent'
          }`}>
            <div className="flex items-start gap-3 px-3.5 py-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isHomeActive ? 'bg-primary/10' : 'bg-gray-200'
              }`}>
                {society
                  ? <Buildings size={16} weight="duotone" className={isHomeActive ? 'text-primary' : 'text-gray-500'} />
                  : <House size={16} weight="duotone" className="text-gray-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-body text-sm font-semibold text-gray-800 truncate">
                    {society?.name ?? 'No society linked'}
                  </p>
                  <span className="font-body text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full leading-none shrink-0">
                    Home
                  </span>
                  {isHomeActive && (
                    <span className="font-body text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full leading-none shrink-0">
                      Active
                    </span>
                  )}
                </div>
                <p className="font-body text-xs text-gray-400 mt-0.5">
                  {resident?.block ? `${resident.block}-` : ''}{resident?.flat_no ?? '—'}
                  {society ? ` · ${society.city}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100/80 px-3.5 py-2">
              <motion.button
                onClick={() => setShowSocietySwitcher(true)}
                disabled={changingSociety}
                className="font-body text-xs font-semibold text-gray-500 flex items-center gap-1 disabled:opacity-50"
                whileTap={{ scale: 0.92 }}
                transition={SPRING}
              >
                {changingSociety
                  ? <SpinnerGap size={11} weight="bold" className="animate-spin" />
                  : <ArrowsLeftRight size={11} weight="bold" />
                }
                Change home
              </motion.button>
              {!isHomeActive && (
                <motion.button
                  onClick={() => setActiveAddress(null)}
                  className="font-body text-xs font-semibold text-primary flex items-center gap-1"
                  whileTap={{ scale: 0.92 }}
                  transition={SPRING}
                >
                  <Check size={11} weight="bold" />
                  Switch to home
                </motion.button>
              )}
            </div>
          </div>

          {/* Saved addresses */}
          {savedAddresses.length > 0 && (
            <>
              <p className="font-body text-[10px] font-bold text-gray-400 uppercase tracking-wider px-0.5">
                Saved
              </p>
              <div className="space-y-2">
                <AnimatePresence>
                  {savedAddresses.map((addr) => {
                    const isActive = activeAddress?.id === addr.id
                    return (
                      <motion.div
                        key={addr.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={SPRING}
                        className={`rounded-2xl overflow-hidden border transition-colors ${
                          isActive ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3 px-3.5 py-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isActive ? 'bg-primary/10' : 'bg-gray-200'
                          }`}>
                            <MapPin size={16} weight="duotone" className={isActive ? 'text-primary' : 'text-gray-500'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-body text-sm font-semibold text-gray-800 truncate">
                                {addr.society_name}
                              </p>
                              {isActive && (
                                <span className="font-body text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full leading-none shrink-0">
                                  Active
                                </span>
                              )}
                              {addr.address_type === 'previous_home' && (
                                <span className="font-body text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full leading-none shrink-0">
                                  Prev home
                                </span>
                              )}
                            </div>
                            <p className="font-body text-xs text-gray-400 mt-0.5">
                              {addr.flat_no ? `${addr.block ? `${addr.block}-` : ''}${addr.flat_no} · ` : ''}{addr.city}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100/80 px-3.5 py-2">
                          {!isActive ? (
                            <motion.button
                              onClick={() => setActiveAddress(addr)}
                              className="font-body text-xs font-semibold text-primary"
                              whileTap={{ scale: 0.92 }}
                              transition={SPRING}
                            >
                              Use this address
                            </motion.button>
                          ) : (
                            <span className="font-body text-xs text-emerald-600 font-medium flex items-center gap-1">
                              <Check size={11} weight="bold" />
                              Currently active
                            </span>
                          )}
                          <motion.button
                            onClick={() => setConfirmDeleteAddr(addr)}
                            disabled={deletingAddressId === addr.id}
                            className="w-7 h-7 rounded-lg bg-danger-light flex items-center justify-center disabled:opacity-40"
                            whileTap={{ scale: 0.88 }}
                            transition={SPRING}
                          >
                            {deletingAddressId === addr.id
                              ? <SpinnerGap size={13} weight="bold" className="animate-spin text-danger" />
                              : <Trash size={13} weight="bold" className="text-danger" />}
                          </motion.button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </>
          )}

          {savedAddresses.length === 0 && (
            <p className="font-body text-xs text-gray-400 text-center py-2">
              No saved addresses yet — tap Add to save one.
            </p>
          )}
        </motion.div>

        {/* Account card */}
        <motion.div variants={staggerItem} className="card space-y-3">
          <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</p>
          <InfoRow
            icon={<Calendar size={16} weight="duotone" className="text-primary" />}
            label="Member since"
            value={memberSince}
          />
        </motion.div>

        {/* Logout */}
        <motion.button
          variants={staggerItem}
          onClick={() => setConfirmLogout(true)}
          className="w-full mt-4 mb-6 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-danger/30 bg-danger-light text-danger-dark font-body font-semibold text-sm hover:bg-danger/10 transition-colors"
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
        >
          <SignOut size={16} weight="bold" />
          Logout
        </motion.button>
      </motion.div>

      {/* Logout confirm */}
      {confirmLogout && (
        <ConfirmDialog
          title="Logout?"
          message="You'll need to verify your mobile number again to log back in."
          confirmLabel="Yes, Logout"
          variant="danger"
          isLoading={loggingOut}
          onConfirm={handleLogout}
          onCancel={() => setConfirmLogout(false)}
        />
      )}

      {/* Delete address confirm */}
      {confirmDeleteAddr && (
        <ConfirmDialog
          title="Remove address?"
          message={`Remove "${confirmDeleteAddr.society_name}" from your address book?`}
          confirmLabel="Remove"
          variant="danger"
          isLoading={deletingAddressId === confirmDeleteAddr.id}
          onConfirm={() => handleDeleteAddress(confirmDeleteAddr)}
          onCancel={() => setConfirmDeleteAddr(null)}
        />
      )}

      {/* Change home address */}
      <AnimatePresence>
        {showSocietySwitcher && user && (
          <SocietySwitcherSheet
            key="society-change"
            mode="change"
            userId={user.id}
            residentId={resident?.id ?? ''}
            currentCity={society?.city}
            onSelect={handleChangeSociety}
            onClose={() => setShowSocietySwitcher(false)}
          />
        )}
      </AnimatePresence>

      {/* Add new address */}
      <AnimatePresence>
        {showAddAddressSheet && user && (
          <SocietySwitcherSheet
            key="society-add"
            mode="browse"
            userId={user.id}
            residentId={resident?.id ?? ''}
            onSelect={handleAddAddress}
            onClose={() => setShowAddAddressSheet(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-body text-xs text-gray-400">{label}</p>
        <p className="font-body text-sm font-semibold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  )
}
