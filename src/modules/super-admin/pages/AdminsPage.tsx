import { useEffect, useState } from 'react'
import { Users, ToggleLeft, ToggleRight, Loader2, Phone, Plus, Building2 } from 'lucide-react'
import type { User, Society } from '@/shared/types'
import { fetchUsersByRole, toggleUserActive } from '@/shared/services/userService'
import { fetchSocieties } from '@/shared/services/societyService'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import AssignAdminModal from '../components/AssignAdminModal'

export default function AdminsPage() {
  const [admins, setAdmins] = useState<User[]>([])
  const [societies, setSocieties] = useState<Society[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  async function load() {
    setIsLoading(true)
    try {
      const [adminList, societyList] = await Promise.all([
        fetchUsersByRole('rwa_admin'),
        fetchSocieties(),
      ])
      setAdmins(adminList)
      setSocieties(societyList)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleToggle(admin: User) {
    setTogglingId(admin.id)
    try {
      await toggleUserActive(admin.id, admin.is_active)
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, is_active: !a.is_active } : a))
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTogglingId(null)
    }
  }

  const societyName = (id: string | null) =>
    id ? societies.find((s) => s.id === id)?.name ?? 'Unknown society' : 'No society'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-800">RWA Admins</h1>
          <p className="font-body text-sm text-gray-400 mt-0.5">{admins.length} assigned</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 !px-4 !py-2 !text-sm"
        >
          <Plus size={16} />
          Assign Admin
        </button>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {isLoading ? <LoadingSpinner /> : admins.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No RWA admins yet"
          description="Click 'Assign Admin' to promote a registered user."
        />
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <div key={admin.id} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-heading font-bold text-primary">
                    {(admin.name ?? admin.mobile).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-body font-semibold text-gray-800 truncate">
                      {admin.name ?? 'Unnamed Admin'}
                    </p>
                    <span className={admin.is_active ? 'badge-success' : 'badge-danger'}>
                      {admin.is_active ? 'active' : 'inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400 font-body mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1"><Phone size={12} />{admin.mobile}</span>
                    <span className="flex items-center gap-1"><Building2 size={12} />{societyName(admin.society_id)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleToggle(admin)}
                disabled={togglingId === admin.id}
                className="shrink-0 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                title={admin.is_active ? 'Deactivate' : 'Activate'}
              >
                {togglingId === admin.id ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : admin.is_active ? (
                  <ToggleRight size={26} className="text-success" />
                ) : (
                  <ToggleLeft size={26} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AssignAdminModal
          onClose={() => setShowModal(false)}
          onAssigned={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
