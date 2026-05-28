import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CaretLeft, Users } from '@phosphor-icons/react'
import { SERVICE_TYPES } from '@/shared/constants/serviceTypes'
import { fetchWorkersForResident } from '../services/residentPortalService'
import type { ResidentWorker } from '../services/residentPortalService'
import { useResidentStore } from '../stores/residentStore'
import BookingModal from '../components/BookingModal'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'

const SERVICE_LABELS: Record<string, string> = {
  maid: 'Maid (Full)',
  jhadu_pocha: 'Jhadu Pocha',
  bartan: 'Bartan',
  cooking: 'Cooking',
  car_cleaning: 'Car Cleaning',
  laundry: 'Laundry',
  child_care: 'Child Care',
  elder_care: 'Elder Care',
  deep_cleaning: 'Deep Cleaning',
  full_time: 'Full Time',
}

const SERVICE_PILL_COLORS: Record<string, string> = {
  maid:          'bg-purple-100 text-purple-700',
  jhadu_pocha:   'bg-blue-100 text-blue-700',
  bartan:        'bg-teal-100 text-teal-700',
  cooking:       'bg-orange-100 text-orange-700',
  car_cleaning:  'bg-slate-100 text-slate-700',
  laundry:       'bg-sky-100 text-sky-700',
  child_care:    'bg-pink-100 text-pink-700',
  elder_care:    'bg-rose-100 text-rose-700',
  deep_cleaning: 'bg-green-100 text-green-700',
  full_time:     'bg-indigo-100 text-indigo-700',
}

const CHIP_ACTIVE: Record<string, string> = {
  maid:          'bg-purple-600 text-white',
  jhadu_pocha:   'bg-blue-600 text-white',
  bartan:        'bg-teal-600 text-white',
  cooking:       'bg-orange-600 text-white',
  car_cleaning:  'bg-slate-600 text-white',
  laundry:       'bg-sky-600 text-white',
  child_care:    'bg-pink-600 text-white',
  elder_care:    'bg-rose-600 text-white',
  deep_cleaning: 'bg-green-600 text-white',
  full_time:     'bg-indigo-600 text-white',
}

function WorkerAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="w-12 h-12 rounded-full object-cover shrink-0"
      />
    )
  }
  const initial = name[0]?.toUpperCase() ?? '?'
  return (
    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="font-heading font-bold text-primary text-lg">{initial}</span>
    </div>
  )
}

export default function ResidentBrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { resident } = useResidentStore()
  const chipScrollRef = useRef<HTMLDivElement>(null)

  // Active category chip — null means "All"
  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get('category') ?? null,
  )

  const [allWorkers, setAllWorkers] = useState<ResidentWorker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookingWorker, setBookingWorker] = useState<ResidentWorker | null>(null)

  // Fetch all workers once (no category filter on server side)
  useEffect(() => {
    if (!resident) return
    setIsLoading(true)
    setError(null)
    fetchWorkersForResident(resident.society_id)
      .then((data) => setAllWorkers(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load workers'))
      .finally(() => setIsLoading(false))
  }, [resident])

  // Keep URL param in sync with active chip
  useEffect(() => {
    const current = searchParams.get('category')
    if (activeCategory && current !== activeCategory) {
      setSearchParams({ category: activeCategory }, { replace: true })
    } else if (!activeCategory && current) {
      setSearchParams({}, { replace: true })
    }
  }, [activeCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectChip(id: string | null) {
    setActiveCategory(id)
    // Scroll the selected chip into view
    if (chipScrollRef.current && id) {
      const btn = chipScrollRef.current.querySelector(`[data-id="${id}"]`) as HTMLElement | null
      btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }

  // Client-side filter by active category
  const workers = activeCategory
    ? allWorkers.filter((w) => w.pricing.some((p) => p.serviceTypeId === activeCategory))
    : allWorkers

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Sticky header + chips ───────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        {/* Title row */}
        <div className="px-4 pt-12 pb-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"
          >
            <CaretLeft size={18} weight="bold" className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-gray-800 text-lg leading-tight truncate">
              {activeCategory ? (SERVICE_LABELS[activeCategory] ?? activeCategory) : 'Browse Workers'}
            </h1>
            <p className="font-body text-xs text-gray-400">
              {isLoading
                ? 'Loading…'
                : `${workers.length} worker${workers.length === 1 ? '' : 's'} in your society`}
            </p>
          </div>
        </div>

        {/* Service chips row */}
        <div
          ref={chipScrollRef}
          className="flex gap-2 px-4 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* All chip */}
          <button
            onClick={() => selectChip(null)}
            className={`flex-none px-4 py-1.5 rounded-full font-body font-semibold text-xs transition-colors whitespace-nowrap ${
              !activeCategory
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>

          {SERVICE_TYPES.map((s) => {
            const isActive = activeCategory === s.id
            return (
              <button
                key={s.id}
                data-id={s.id}
                onClick={() => selectChip(isActive ? null : s.id)}
                className={`flex-none px-4 py-1.5 rounded-full font-body font-semibold text-xs transition-colors whitespace-nowrap ${
                  isActive
                    ? (CHIP_ACTIVE[s.id] ?? 'bg-primary text-white')
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {SERVICE_LABELS[s.id] ?? s.id}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Workers list ─────────────────────────────────────────────── */}
      <div className="px-4 py-4">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="card text-center py-8">
            <p className="font-body text-danger font-semibold">{error}</p>
          </div>
        ) : workers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={activeCategory ? `No ${SERVICE_LABELS[activeCategory] ?? activeCategory} workers` : 'No workers yet'}
            description={
              activeCategory
                ? 'Try a different service or check back later.'
                : 'Verified workers will appear here once they register.'
            }
          />
        ) : (
          <div className="space-y-3">
            {workers.map((worker) => {
              const minMonthly =
                worker.pricing.length > 0
                  ? Math.min(...worker.pricing.map((p) => p.monthlyRate))
                  : null

              // Show relevant pricing for active category, else all
              const displayPricing = activeCategory
                ? worker.pricing.filter((p) => p.serviceTypeId === activeCategory)
                : worker.pricing

              return (
                <div
                  key={worker.userId}
                  className="card flex items-center gap-3"
                >
                  <WorkerAvatar name={worker.name} photoUrl={worker.photoUrl} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-body font-semibold text-gray-800 text-sm">{worker.name}</p>
                      {worker.gender && (
                        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-body capitalize">
                          {worker.gender}
                        </span>
                      )}
                    </div>

                    {/* Service chips */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {displayPricing.slice(0, 3).map((p) => (
                        <span
                          key={p.serviceTypeId}
                          className={`text-xs rounded-full px-2 py-0.5 font-body font-medium ${
                            SERVICE_PILL_COLORS[p.serviceTypeId] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {SERVICE_LABELS[p.serviceTypeId] ?? p.serviceTypeId}
                        </span>
                      ))}
                      {displayPricing.length > 3 && (
                        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-body">
                          +{displayPricing.length - 3}
                        </span>
                      )}
                    </div>

                    {minMonthly !== null && minMonthly > 0 && (
                      <p className="font-body text-xs text-primary font-semibold mt-1">
                        From ₹{minMonthly}/mo
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setBookingWorker(worker)}
                    className="btn-primary !px-4 !py-2 !text-sm shrink-0"
                  >
                    Book
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Booking Modal ────────────────────────────────────────────── */}
      {bookingWorker !== null && (
        <BookingModal
          worker={bookingWorker}
          onClose={() => setBookingWorker(null)}
          onBooked={() => {
            setBookingWorker(null)
            navigate('/resident/bookings')
          }}
        />
      )}
    </div>
  )
}
