import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="card text-center py-12">
      <Icon size={40} className="text-gray-300 mx-auto mb-3" />
      <p className="font-body font-semibold text-gray-500">{title}</p>
      {description && <p className="font-body text-sm text-gray-400 mt-1">{description}</p>}
    </div>
  )
}
