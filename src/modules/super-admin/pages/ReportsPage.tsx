import { useEffect, useState } from 'react'
import { BarChart3, CalendarCheck, CheckCircle, Clock, XCircle, Users, Briefcase, MessageSquareWarning, ClipboardCheck } from 'lucide-react'
import { fetchPlatformReports, type PlatformReports } from '@/shared/services/dashboardService'
import LoadingSpinner from '@/shared/components/LoadingSpinner'

function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'gray',
}: {
  label: string
  value: number
  icon:  typeof BarChart3
  tone?: 'gray' | 'amber' | 'blue' | 'green' | 'rose' | 'primary'
}) {
  const tones: Record<string, string> = {
    gray:    'bg-gray-100 text-gray-600',
    amber:   'bg-amber-50 text-amber-700',
    blue:    'bg-blue-50 text-blue-700',
    green:   'bg-emerald-50 text-emerald-700',
    rose:    'bg-rose-50 text-rose-700',
    primary: 'bg-primary/10 text-primary',
  }
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="font-heading text-xl font-bold text-gray-800 leading-none">{value}</p>
        <p className="font-body text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [data, setData] = useState<PlatformReports | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlatformReports()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-800">Reports</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">Platform analytics</p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : !data ? (
        <div className="card text-center py-12">
          <BarChart3 size={36} className="text-gray-300 mx-auto mb-2" />
          <p className="font-body text-gray-400 text-sm">No data yet.</p>
        </div>
      ) : (
        <>
          {/* ── Bookings ──────────────────────────────────────────────── */}
          <h2 className="font-heading text-base font-bold text-gray-700 mb-3">Bookings</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatTile label="Total" value={data.bookingTotals.total} icon={CalendarCheck} tone="primary" />
            <StatTile label="Last 7 days" value={data.bookingsLast7d} icon={Clock} tone="blue" />
            <StatTile label="Pending" value={data.bookingTotals.pending} icon={Clock} tone="amber" />
            <StatTile label="Accepted" value={data.bookingTotals.accepted} icon={CheckCircle} tone="green" />
            <StatTile label="Active" value={data.bookingTotals.active} icon={CheckCircle} tone="green" />
            <StatTile label="Completed" value={data.bookingTotals.completed} icon={CheckCircle} tone="gray" />
            <StatTile label="Rejected" value={data.bookingTotals.rejected} icon={XCircle} tone="rose" />
            <StatTile label="Cancelled" value={data.bookingTotals.cancelled} icon={XCircle} tone="rose" />
          </div>

          {/* ── Platform attention ───────────────────────────────────── */}
          <h2 className="font-heading text-base font-bold text-gray-700 mb-3">Attention</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatTile label="Pending KYC (platform)" value={data.pendingKycTotal} icon={ClipboardCheck} tone="amber" />
            <StatTile label="Open complaints" value={data.openComplaints} icon={MessageSquareWarning} tone="rose" />
          </div>

          {/* ── Society breakdown ────────────────────────────────────── */}
          <h2 className="font-heading text-base font-bold text-gray-700 mb-3">By society</h2>
          {data.societyBreakdown.length === 0 ? (
            <div className="card text-center py-10 text-sm font-body text-gray-400">No societies yet.</div>
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="min-w-full text-sm font-body">
                <thead className="bg-gray-50/70">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Society</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">
                      <span className="inline-flex items-center gap-1"><Users size={14} />Residents</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">
                      <span className="inline-flex items-center gap-1"><Briefcase size={14} />Workers</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">Pending KYC</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">Open complaints</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.societyBreakdown.map((s) => (
                    <tr key={s.societyId}>
                      <td className="px-4 py-3 font-semibold text-gray-800">{s.societyName}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{s.residents}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{s.serviceProviders}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={s.pendingKyc > 0 ? 'text-amber-700 font-semibold' : 'text-gray-400'}>
                          {s.pendingKyc}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={s.openComplaints > 0 ? 'text-rose-700 font-semibold' : 'text-gray-400'}>
                          {s.openComplaints}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
