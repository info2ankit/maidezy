import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-800">Reports</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">Society-wise analytics</p>
      </div>
      <div className="card text-center py-16">
        <BarChart3 size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="font-body text-gray-400">Reports coming soon.</p>
      </div>
    </div>
  )
}
