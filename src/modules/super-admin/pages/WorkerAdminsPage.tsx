import { useEffect, useState, useRef } from 'react'
import {
  UserGear, Phone, ToggleLeft, ToggleRight, SpinnerGap,
  Plus, GenderIntersex, HourglassMedium, Trash, Buildings, MapPin,
  PencilSimple, Check, X, MagnifyingGlass,
} from '@phosphor-icons/react'
import {
  fetchWorkerAdmins, toggleUserActive,
  fetchWorkerAdminInvites, deleteWorkerAdminInvite,
  updateWorkerAdminDetails,
} from '@/shared/services/userService'
import type { WorkerAdminInvite } from '@/shared/services/userService'
import { fetchSocieties } from '@/shared/services/societyService'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import CreateWorkerAdminModal from '../components/CreateWorkerAdminModal'
import type { User, Society } from '@/shared/types'

type WorkerAdmin = User & { gender: string | null; society_ids: string[] }

const GENDER_LABEL: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other',
}

export default function WorkerAdminsPage() {
  const [admins, setAdmins]         = useState<WorkerAdmin[]>([])
  const [invites, setInvites]       = useState<WorkerAdminInvite[]>([])
  const [societyMap, setSocietyMap] = useState<Map<string, Society>>(new Map())
  const [isLoading, setIsLoading]   = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [togglingId, setTogglingId]   = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [confirmDeleteInvite, setConfirmDeleteInvite] = useState<WorkerAdminInvite | null>(null)
  const [showModal, setShowModal]     = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editIds, setEditIds]         = useState<string[]>([])
  const [editGender, setEditGender]   = useState('')
  const [editSearch, setEditSearch]   = useState('')
  const [savingId, setSavingId]       = useState<string | null>(null)

  async function load() {
    setIsLoading(true)
    try {
      const [adminsData, invitesData, societiesData] = await Promise.all([
        fetchWorkerAdmins(),
        fetchWorkerAdminInvites(),
        fetchSocieties(),
      ])
      setAdmins(adminsData)
      setInvites(invitesData)
      setSocietyMap(new Map(societiesData.map((s) => [s.id, s])))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleToggle(admin: WorkerAdmin) {
    setTogglingId(admin.id)
    try {
      await toggleUserActive(admin.id, admin.is_active)
      setAdmins((prev) =>
        prev.map((a) => a.id === admin.id ? { ...a, is_active: !a.is_active } : a)
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDeleteInvite(invite: WorkerAdminInvite) {
    setDeletingId(invite.id)
    try {
      await deleteWorkerAdminInvite(invite.id)
      setInvites((prev) => prev.filter((i) => i.id !== invite.id))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDeletingId(null)
      setConfirmDeleteInvite(null)
    }
  }

  function startEdit(admin: WorkerAdmin) {
    setEditingId(admin.id)
    setEditIds(admin.society_ids)
    setEditGender(admin.gender ?? '')
    setEditSearch('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditIds([])
    setEditGender('')
    setEditSearch('')
  }

  async function saveEdit(adminId: string) {
    if (!editGender) {
      setError('Please select a gender before saving.')
      return
    }
    setSavingId(adminId)
    try {
      await updateWorkerAdminDetails(adminId, editGender, editIds)
      setAdmins((prev) =>
        prev.map((a) => a.id === adminId ? { ...a, gender: editGender, society_ids: editIds } : a)
      )
      cancelEdit()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingId(null)
    }
  }

  const totalCount = admins.length + invites.length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-800">Worker Admins</h1>
          <p className="font-body text-sm text-gray-400 mt-0.5">
            {isLoading ? 'Loading…' : `${admins.length} active · ${invites.length} pending`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 !px-4 !py-2 !text-sm"
        >
          <Plus size={16} weight="bold" />
          Add Admin
        </button>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : totalCount === 0 ? (
        <EmptyState
          icon={UserGear}
          title="No Worker Admins yet"
          description="Click 'Add Admin' to create a Worker Admin account."
        />
      ) : (
        <div className="space-y-5">
          {/* ── Active admins ── */}
          {admins.length > 0 && (
            <div>
              <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                Active ({admins.length})
              </p>
              <div className="space-y-4">
                {admins.map((admin) => {
                  const societies = admin.society_ids
                    .map((id) => societyMap.get(id))
                    .filter(Boolean) as Society[]

                  return (
                    <div key={admin.id} className="card space-y-4">
                      {/* Top row: avatar + name + toggle */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="font-heading font-bold text-primary text-lg">
                              {(admin.name ?? admin.mobile).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-body font-bold text-gray-800 text-base truncate">
                              {admin.name ?? 'Unnamed Admin'}
                            </p>
                            <span className={admin.is_active ? 'badge-success' : 'badge-danger'}>
                              {admin.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggle(admin)}
                          disabled={togglingId === admin.id}
                          title={admin.is_active ? 'Deactivate' : 'Activate'}
                          className="shrink-0 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                        >
                          {togglingId === admin.id ? (
                            <SpinnerGap size={24} weight="bold" className="animate-spin" />
                          ) : admin.is_active ? (
                            <ToggleRight size={30} weight="fill" className="text-success" />
                          ) : (
                            <ToggleLeft size={30} weight="regular" />
                          )}
                        </button>
                      </div>

                      {/* Info rows */}
                      <div className="grid grid-cols-2 gap-2">
                        <InfoRow icon={<Phone size={13} weight="duotone" className="text-primary" />} label="Mobile" value={`+91 ${admin.mobile}`} />
                        {admin.gender && (
                          <InfoRow icon={<GenderIntersex size={13} weight="duotone" className="text-primary" />} label="Gender" value={GENDER_LABEL[admin.gender] ?? admin.gender} />
                        )}
                      </div>

                      {/* Assigned societies */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Buildings size={13} weight="duotone" className="text-primary" />
                            <p className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Assigned Societies ({editingId === admin.id ? editIds.length : societies.length})
                            </p>
                          </div>
                          {editingId === admin.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => saveEdit(admin.id)}
                                disabled={savingId === admin.id}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-body font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                {savingId === admin.id
                                  ? <SpinnerGap size={12} weight="bold" className="animate-spin" />
                                  : <Check size={12} weight="bold" />}
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                              >
                                <X size={14} weight="bold" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(admin)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-gray-500 hover:bg-gray-100 text-xs font-body font-semibold transition-colors"
                            >
                              <PencilSimple size={12} weight="bold" />
                              Edit
                            </button>
                          )}
                        </div>

                        {editingId === admin.id ? (
                          <div className="space-y-3">
                            {/* Gender pills */}
                            <div>
                              <p className="font-body text-xs text-gray-400 mb-1.5">Gender</p>
                              <div className="flex gap-2">
                                {(['male', 'female', 'other'] as const).map((g) => (
                                  <button
                                    key={g}
                                    type="button"
                                    onClick={() => setEditGender(g)}
                                    className={[
                                      'px-3 py-1.5 rounded-full text-xs font-body font-semibold transition-colors capitalize',
                                      editGender === g
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                                    ].join(' ')}
                                  >
                                    {g}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <SocietyPicker
                              allSocieties={Array.from(societyMap.values())}
                              selectedIds={editIds}
                              search={editSearch}
                              onSearchChange={setEditSearch}
                              onToggle={(id) =>
                                setEditIds((prev) =>
                                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                                )
                              }
                            />
                          </div>
                        ) : societies.length === 0 ? (
                          <p className="font-body text-xs text-gray-400 italic">
                            No societies assigned —{' '}
                            <button onClick={() => startEdit(admin)} className="text-primary underline">
                              add now
                            </button>
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {societies.map((s) => (
                              <div key={s.id} className="flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2">
                                <Buildings size={14} weight="fill" className="text-primary shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-body text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                                  <p className="font-body text-xs text-gray-400 flex items-center gap-1">
                                    <MapPin size={10} weight="duotone" />
                                    {s.city}, {s.state}
                                  </p>
                                </div>
                                <span className={s.status === 'active' ? 'badge-success ml-auto shrink-0' : 'badge-danger ml-auto shrink-0'}>
                                  {s.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Pending invites ── */}
          {invites.length > 0 && (
            <div>
              <p className="font-body text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                Pending · Awaiting first login ({invites.length})
              </p>
              <div className="space-y-4">
                {invites.map((invite) => {
                  const societies = (invite.society_ids ?? [])
                    .map((id) => societyMap.get(id))
                    .filter(Boolean) as Society[]

                  return (
                    <div key={invite.id} className="card space-y-4 opacity-85">
                      {/* Top row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                            <HourglassMedium size={22} weight="duotone" className="text-accent" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-body font-bold text-gray-800 text-base truncate">
                              {invite.name}
                            </p>
                            <span className="badge-pending">Pending login</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setConfirmDeleteInvite(invite)}
                          disabled={deletingId === invite.id}
                          title="Cancel invite"
                          className="shrink-0 text-gray-400 hover:text-danger transition-colors disabled:opacity-50"
                        >
                          {deletingId === invite.id ? (
                            <SpinnerGap size={18} weight="bold" className="animate-spin" />
                          ) : (
                            <Trash size={20} weight="regular" />
                          )}
                        </button>
                      </div>

                      {/* Info rows */}
                      <div className="grid grid-cols-2 gap-2">
                        <InfoRow icon={<Phone size={13} weight="duotone" className="text-accent" />} label="Mobile" value={`+91 ${invite.mobile}`} />
                        <InfoRow icon={<GenderIntersex size={13} weight="duotone" className="text-accent" />} label="Gender" value={GENDER_LABEL[invite.gender] ?? invite.gender} />
                      </div>

                      {/* Assigned societies */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Buildings size={13} weight="duotone" className="text-accent" />
                          <p className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Assigned Societies ({societies.length})
                          </p>
                        </div>
                        {societies.length === 0 ? (
                          <p className="font-body text-xs text-gray-400 italic">No societies assigned</p>
                        ) : (
                          <div className="space-y-1.5">
                            {societies.map((s) => (
                              <div key={s.id} className="flex items-center gap-2 bg-accent/5 rounded-xl px-3 py-2">
                                <Buildings size={14} weight="fill" className="text-accent shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-body text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                                  <p className="font-body text-xs text-gray-400 flex items-center gap-1">
                                    <MapPin size={10} weight="duotone" />
                                    {s.city}, {s.state}
                                  </p>
                                </div>
                                <span className={s.status === 'active' ? 'badge-success ml-auto shrink-0' : 'badge-danger ml-auto shrink-0'}>
                                  {s.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CreateWorkerAdminModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load() }}
        />
      )}

      {/* Confirm invite cancellation */}
      {confirmDeleteInvite && (
        <ConfirmDialog
          title="Cancel this invite?"
          message={`Cancel the pending invite for ${confirmDeleteInvite.name} (+91 ${confirmDeleteInvite.mobile})? They won't be able to log in as a Worker Admin until you create a new invite.`}
          confirmLabel="Yes, cancel invite"
          variant="danger"
          isLoading={deletingId === confirmDeleteInvite.id}
          onConfirm={() => handleDeleteInvite(confirmDeleteInvite)}
          onCancel={() => setConfirmDeleteInvite(null)}
        />
      )}
    </div>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="font-body text-xs text-gray-400">{label}</p>
        <p className="font-body text-sm font-semibold text-gray-700 truncate">{value}</p>
      </div>
    </div>
  )
}

// ─── Society picker (inline edit) ─────────────────────────────────────────────

function SocietyPicker({
  allSocieties,
  selectedIds,
  search,
  onSearchChange,
  onToggle,
}: {
  allSocieties:   Society[]
  selectedIds:    string[]
  search:         string
  onSearchChange: (v: string) => void
  onToggle:       (id: string) => void
}) {
  const dropRef = useRef<HTMLDivElement>(null)
  const filtered = allSocieties.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div ref={dropRef} className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <MagnifyingGlass size={13} weight="regular" className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search societies…"
          className="flex-1 text-sm font-body outline-none bg-transparent"
          autoFocus
        />
        {selectedIds.length > 0 && (
          <span className="text-xs font-body font-semibold text-primary shrink-0">
            {selectedIds.length} selected
          </span>
        )}
      </div>

      {/* Options */}
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm font-body text-gray-400 text-center py-4">No societies found</p>
        ) : (
          filtered.map((s) => {
            const selected = selectedIds.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggle(s.id)}
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
                  <p className="font-body text-xs text-gray-400">{s.city}, {s.state}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
