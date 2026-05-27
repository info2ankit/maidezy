import { useState, useEffect } from 'react'
import { X, Search, UserCheck, AlertCircle, Loader2 } from 'lucide-react'
import { findUserByMobile, assignAsRwaAdmin } from '@/shared/services/userService'
import { fetchSocieties } from '@/shared/services/societyService'
import type { User, Society } from '@/shared/types'

interface AssignAdminModalProps {
  onClose: () => void
  onAssigned: () => void
}

type Step = 'search' | 'assign'

export default function AssignAdminModal({ onClose, onAssigned }: AssignAdminModalProps) {
  const [step, setStep] = useState<Step>('search')
  const [mobile, setMobile] = useState('')
  const [foundUser, setFoundUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [societyId, setSocietyId] = useState('')
  const [societies, setSocieties] = useState<Society[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSocieties().then(setSocieties).catch((e: Error) => setError(e.message))
  }, [])

  async function handleSearch() {
    setError(null)
    if (!/^\d{10}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    setIsLoading(true)
    try {
      const user = await findUserByMobile(mobile)
      if (!user) {
        setError('No user found with this mobile. Ask them to log in to MaidEzy first, then come back.')
        return
      }
      if (user.role === 'super_admin') {
        setError('This user is a Super Admin and cannot be reassigned.')
        return
      }
      setFoundUser(user)
      setName(user.name ?? '')
      setSocietyId(user.society_id ?? '')
      setStep('assign')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAssign() {
    setError(null)
    if (!foundUser) return
    if (!name.trim() || name.trim().length < 2) { setError('Enter the admin\'s name'); return }
    if (!societyId) { setError('Select a society'); return }

    setIsLoading(true)
    try {
      await assignAsRwaAdmin(foundUser.id, societyId, name.trim())
      onAssigned()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-heading text-lg font-bold text-gray-800">
            {step === 'search' ? 'Assign RWA Admin' : 'Confirm Assignment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-danger-light border border-danger/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" />
              <p className="text-sm font-body text-danger-dark">{error}</p>
            </div>
          )}

          {step === 'search' ? (
            <>
              <p className="text-sm font-body text-gray-500">
                Enter the mobile number of a user who has already logged in to MaidEzy. They'll be promoted to RWA Admin.
              </p>

              <div>
                <label className="label">Mobile Number</label>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 shrink-0">
                    <span className="text-lg leading-none">🇮🇳</span>
                    <span className="font-body text-gray-600 font-semibold text-sm">+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="98765 43210"
                    className="input-field flex-1"
                    autoFocus
                  />
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Find User
              </button>
            </>
          ) : foundUser && (
            <>
              {/* User card */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCheck size={20} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-body font-semibold text-gray-800 truncate">
                    {foundUser.name ?? 'Unnamed User'}
                  </p>
                  <p className="font-body text-xs text-gray-500">+91 {foundUser.mobile} · currently {foundUser.role.replace('_', ' ')}</p>
                </div>
              </div>

              <div>
                <label className="label">Admin Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Assign to Society</label>
                {societies.length === 0 ? (
                  <p className="text-sm text-gray-400 font-body bg-gray-50 rounded-xl px-3 py-3">
                    No societies yet. Register one first.
                  </p>
                ) : (
                  <select
                    value={societyId}
                    onChange={(e) => setSocietyId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">— Select a society —</option>
                    {societies.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} · {s.city}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep('search'); setFoundUser(null); setError(null) }}
                  className="btn-secondary flex-1 !py-2.5"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={isLoading || societies.length === 0}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 !py-2.5"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Assign Admin'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
