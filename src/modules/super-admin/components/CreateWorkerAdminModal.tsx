import { useState, useEffect, useRef } from 'react'
import { X, UserGear, WarningCircle, SpinnerGap, Buildings, Check, MagnifyingGlass } from '@phosphor-icons/react'
import { createWorkerAdminInvite } from '@/shared/services/userService'
import { fetchSocieties } from '@/shared/services/societyService'
import type { Society } from '@/shared/types'

type Gender = 'male' | 'female' | 'other'

interface Props {
  onClose:   () => void
  onCreated: () => void
}

export default function CreateWorkerAdminModal({ onClose, onCreated }: Props) {
  const [name, setName]           = useState('')
  const [mobile, setMobile]       = useState('')
  const [gender, setGender]       = useState<Gender | ''>('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [societies, setSocieties] = useState<Society[]>([])
  const [search, setSearch]       = useState('')
  const [dropOpen, setDropOpen]   = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSocieties().then(setSocieties).catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = societies.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase())
  )

  function toggleSociety(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectedSocieties = societies.filter((s) => selectedIds.includes(s.id))

  async function handleCreate() {
    setError(null)
    if (!name.trim() || name.trim().length < 2) { setError('Enter the admin\'s full name'); return }
    if (!/^\d{10}$/.test(mobile))               { setError('Enter a valid 10-digit mobile number'); return }
    if (!gender)                                 { setError('Select gender'); return }
    if (selectedIds.length === 0)                { setError('Select at least one society'); return }

    setIsLoading(true)
    try {
      await createWorkerAdminInvite(name.trim(), mobile, gender, selectedIds)
      onCreated()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserGear size={18} weight="duotone" className="text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-gray-800">Add Worker Admin</h2>
              <p className="font-body text-xs text-gray-400">They'll log in with this mobile number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-danger-light border border-danger/20 rounded-xl px-3 py-2.5">
              <WarningCircle size={16} weight="duotone" className="text-danger mt-0.5 shrink-0" />
              <p className="text-sm font-body text-danger-dark">{error}</p>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="font-body text-xs text-gray-400 mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="input-field"
              autoFocus
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="font-body text-xs text-gray-400 mb-1.5 block">Mobile Number</label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 shrink-0">
                <span className="text-base leading-none">🇮🇳</span>
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
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="font-body text-xs text-gray-400 mb-1.5 block">Gender</label>
            <div className="flex gap-2">
              {(['male', 'female', 'other'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={[
                    'flex-1 py-2.5 rounded-xl text-sm font-body font-semibold border-2 capitalize transition-colors',
                    gender === g
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary/40',
                  ].join(' ')}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Society multi-select */}
          <div ref={dropRef}>
            <label className="font-body text-xs text-gray-400 mb-1.5 block">
              Assigned Societies
              {selectedIds.length > 0 && (
                <span className="ml-1.5 text-primary font-semibold">{selectedIds.length} selected</span>
              )}
            </label>

            {/* Selected society chips */}
            {selectedSocieties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedSocieties.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-body font-semibold px-2.5 py-1 rounded-full"
                  >
                    <Buildings size={11} weight="fill" />
                    {s.name}
                    <button
                      type="button"
                      onClick={() => toggleSociety(s.id)}
                      className="ml-0.5 hover:text-danger transition-colors"
                    >
                      <X size={11} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Dropdown trigger */}
            <button
              type="button"
              onClick={() => setDropOpen((v) => !v)}
              className="input-field w-full flex items-center justify-between text-left"
            >
              <span className={selectedIds.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
                {selectedIds.length === 0 ? 'Search and select societies…' : 'Add more societies'}
              </span>
              <Buildings size={16} weight="duotone" className="text-gray-400 shrink-0" />
            </button>

            {/* Dropdown panel */}
            {dropOpen && (
              <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
                {/* Search */}
                <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                  <MagnifyingGlass size={14} weight="regular" className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or city…"
                    className="flex-1 text-sm font-body outline-none bg-transparent"
                    autoFocus
                  />
                </div>

                {/* Options */}
                <div className="max-h-44 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-sm font-body text-gray-400 text-center py-4">No societies found</p>
                  ) : (
                    filtered.map((s) => {
                      const selected = selectedIds.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSociety(s.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className={[
                            'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                            selected ? 'bg-primary border-primary' : 'border-gray-300',
                          ].join(' ')}>
                            {selected && <Check size={11} weight="bold" className="text-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-body text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                            <p className="font-body text-xs text-gray-400">{s.city}</p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2 !py-3"
          >
            {isLoading && <SpinnerGap size={16} weight="bold" className="animate-spin" />}
            Create Worker Admin
          </button>
        </div>
      </div>
    </div>
  )
}
