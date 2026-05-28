import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Phone, Buildings, House, PencilSimple, Check, X, SpinnerGap,
  SignOut, MapPin, Calendar,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/shared/stores/authStore'
import { useResidentStore } from '../stores/residentStore'
import { signOut } from '@/shared/services/authService'
import { supabase } from '@/lib/supabase'
import type { Society } from '@/shared/types'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import ConfirmDialog from '@/shared/components/ConfirmDialog'

export default function ResidentProfilePage() {
  const navigate = useNavigate()
  const { user, setUser, logout }       = useAuthStore()
  const { resident, clearResident }     = useResidentStore()

  const [society, setSociety]           = useState<Society | null>(null)
  const [isLoading, setIsLoading]       = useState(true)
  const [editingName, setEditingName]   = useState(false)
  const [nameValue, setNameValue]       = useState(user?.name ?? '')
  const [savingName, setSavingName]     = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut]     = useState(false)

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

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      {/* Header gradient with avatar */}
      <div className="bg-gradient-to-b from-primary to-[#2a4f7a] px-5 pt-8 pb-12 rounded-b-3xl">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
            <span className="font-heading font-bold text-white text-3xl">{initial}</span>
          </div>

          {editingName ? (
            <div className="mt-3 flex items-center gap-2 w-full max-w-xs">
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
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <p className="font-heading font-bold text-white text-xl">
                {user?.name ?? 'Add your name'}
              </p>
              <button
                onClick={() => setEditingName(true)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <PencilSimple size={12} weight="bold" className="text-white" />
              </button>
            </div>
          )}

          <p className="font-body text-sm text-white/70 mt-1">Resident</p>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-3">
        {error && (
          <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 text-sm font-body text-danger-dark">
            {error}
          </div>
        )}

        {/* Contact card */}
        <div className="card space-y-3">
          <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Contact
          </p>
          <InfoRow
            icon={<Phone size={16} weight="duotone" className="text-primary" />}
            label="Mobile"
            value={`+91 ${user?.mobile ?? ''}`}
          />
        </div>

        {/* Society card */}
        <div className="card space-y-3">
          <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Society
          </p>
          {society ? (
            <>
              <InfoRow
                icon={<Buildings size={16} weight="duotone" className="text-primary" />}
                label="Society"
                value={society.name}
              />
              <InfoRow
                icon={<MapPin size={16} weight="duotone" className="text-primary" />}
                label="Location"
                value={`${society.city}, ${society.state}`}
              />
              <InfoRow
                icon={<House size={16} weight="duotone" className="text-primary" />}
                label="Flat"
                value={resident?.block ? `${resident.block} · ${resident.flat_no}` : (resident?.flat_no ?? '—')}
              />
            </>
          ) : (
            <p className="font-body text-sm text-gray-400">No society linked</p>
          )}
        </div>

        {/* Meta card */}
        <div className="card space-y-3">
          <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Account
          </p>
          <InfoRow
            icon={<Calendar size={16} weight="duotone" className="text-primary" />}
            label="Member since"
            value={memberSince}
          />
        </div>

        {/* Logout */}
        <button
          onClick={() => setConfirmLogout(true)}
          className="w-full mt-4 mb-6 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-danger/30 bg-danger-light text-danger-dark font-body font-semibold text-sm hover:bg-danger/10 transition-colors"
        >
          <SignOut size={16} weight="bold" />
          Logout
        </button>
      </div>

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
