import { useEffect, useState } from 'react'
import { CalendarCheck } from '@phosphor-icons/react'
import { useAuthStore } from '@/shared/stores/authStore'
import {
  fetchBookingsForWorkerAdmin,
  acceptBooking,
  rejectBooking,
  proposeReschedule,
  withdrawReschedule,
  type BookingForWorkerAdmin,
} from '@/shared/services/bookingService'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import BookingRequestCard from '@/modules/service-provider/components/BookingRequestCard'

type Tab = 'pending' | 'active' | 'history'
const TABS: Tab[] = ['pending', 'active', 'history']

const TAB_LABEL: Record<Tab, string> = {
  pending: 'Pending',
  active:  'Active',
  history: 'History',
}

function matchesTab(status: string, tab: Tab): boolean {
  if (tab === 'pending') return ['pending', 'reschedule_requested'].includes(status)
  if (tab === 'active')  return ['accepted', 'active'].includes(status)
  return ['completed', 'cancelled', 'rejected'].includes(status)
}

export default function WaBookingsPage() {
  const userId = useAuthStore((s) => s.user?.id)
  const [bookings, setBookings] = useState<BookingForWorkerAdmin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pending')

  async function load() {
    if (!userId) return
    setIsLoading(true)
    setError(null)
    try {
      const rows = await fetchBookingsForWorkerAdmin(userId)
      setBookings(rows)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [userId])

  const filtered = bookings.filter((b) => matchesTab(b.status, tab))
  const counts = {
    pending: bookings.filter((b) => matchesTab(b.status, 'pending')).length,
    active:  bookings.filter((b) => matchesTab(b.status, 'active')).length,
    history: bookings.filter((b) => matchesTab(b.status, 'history')).length,
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-gray-800">Bookings</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">
          Bookings for workers you oversee. Use the call button to contact them.
        </p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 rounded-full text-sm font-body font-semibold shrink-0 transition-colors capitalize flex items-center gap-1.5',
              tab === t ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {TAB_LABEL[t]}
            {counts[t] > 0 && (
              <span className={[
                'text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center',
                tab === t ? 'bg-white/20' : 'bg-gray-200 text-gray-600',
              ].join(' ')}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={tab === 'pending' ? 'No pending requests' : tab === 'active' ? 'No active bookings' : 'No booking history yet'}
          description="Bookings made to workers in your societies will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <BookingRequestCard
              key={b.id}
              booking={b}
              viewerRole="worker_admin"
              workerStrip={{ name: b.workerName, mobile: b.workerMobile }}
              onAccept={async () => {
                await acceptBooking(b.id, b.workerId)
                await load()
              }}
              onReject={async () => {
                await rejectBooking(b.id, b.workerId)
                await load()
              }}
              onReschedule={async (input) => {
                if (!userId) return
                await proposeReschedule(b.id, b.workerId, userId, 'worker_admin', input)
                await load()
              }}
              onWithdraw={async () => {
                await withdrawReschedule(b.id)
                await load()
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
