import { useEffect, useState } from 'react'
import { Plus, MapPin, ToggleLeft, ToggleRight, Loader2, Building2 } from 'lucide-react'
import type { Society } from '@/shared/types'
import { fetchSocieties, toggleSocietyStatus } from '@/shared/services/societyService'
import RegisterSocietyModal from '../components/RegisterSocietyModal'

export default function SocietiesPage() {
  const [societies, setSocieties] = useState<Society[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function loadSocieties() {
    setIsLoading(true)
    setError(null)
    fetchSocieties()
      .then(setSocieties)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadSocieties() }, [])

  async function handleToggle(society: Society) {
    setTogglingId(society.id)
    try {
      await toggleSocietyStatus(society.id, society.status)
      setSocieties((prev) =>
        prev.map((s) =>
          s.id === society.id
            ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' }
            : s
        )
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-800">Societies</h1>
          <p className="font-body text-sm text-gray-400 mt-0.5">{societies.length} registered</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 !px-4 !py-2 !text-sm"
        >
          <Plus size={16} />
          Register Society
        </button>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : societies.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="font-body text-gray-400">No societies registered yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-sm font-semibold text-accent font-body hover:underline"
          >
            Register the first society →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {societies.map((society) => (
            <div key={society.id} className="card flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-semibold text-gray-800">{society.name}</h3>
                  <span className={society.status === 'active' ? 'badge-success' : 'badge-danger'}>
                    {society.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm text-gray-400 font-body">
                  <MapPin size={13} />
                  <span className="truncate">{society.address}, {society.city}, {society.state} — {society.pincode}</span>
                </div>
              </div>
              <button
                onClick={() => handleToggle(society)}
                disabled={togglingId === society.id}
                className="shrink-0 text-gray-400 hover:text-primary transition-colors disabled:opacity-50 mt-0.5"
                title={society.status === 'active' ? 'Deactivate' : 'Activate'}
              >
                {togglingId === society.id ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : society.status === 'active' ? (
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
        <RegisterSocietyModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadSocieties() }}
        />
      )}
    </div>
  )
}
