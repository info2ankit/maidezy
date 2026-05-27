import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { createSociety } from '@/shared/services/societyService'
import { useAuthStore } from '@/shared/stores/authStore'
import { useState } from 'react'

const schema = z.object({
  name:    z.string().min(3, 'Society name must be at least 3 characters'),
  address: z.string().min(5, 'Enter full address'),
  city:    z.string().min(2, 'Enter city'),
  state:   z.string().min(2, 'Enter state'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode'),
})

type FormData = z.infer<typeof schema>

interface RegisterSocietyModalProps {
  onClose: () => void
  onCreated: () => void
}

export default function RegisterSocietyModal({ onClose, onCreated }: RegisterSocietyModalProps) {
  const user = useAuthStore((s) => s.user)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    if (!user) return
    setServerError(null)
    try {
      await createSociety(data, user.id)
      onCreated()
    } catch (e) {
      setServerError((e as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-heading text-lg font-bold text-gray-800">Register Society</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-5 space-y-4">
          {serverError && (
            <div className="bg-danger-light border border-danger/20 rounded-xl px-3 py-2 text-sm font-body text-danger-dark">
              {serverError}
            </div>
          )}

          <div>
            <label className="label">Society Name</label>
            <input {...register('name')} className="input-field" placeholder="Green Valley Apartments" autoFocus />
            {errors.name && <p className="mt-1 text-xs text-danger font-body">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Full Address</label>
            <input {...register('address')} className="input-field" placeholder="Plot 12, Sector 18" />
            {errors.address && <p className="mt-1 text-xs text-danger font-body">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input {...register('city')} className="input-field" placeholder="Noida" />
              {errors.city && <p className="mt-1 text-xs text-danger font-body">{errors.city.message}</p>}
            </div>
            <div>
              <label className="label">State</label>
              <input {...register('state')} className="input-field" placeholder="Uttar Pradesh" />
              {errors.state && <p className="mt-1 text-xs text-danger font-body">{errors.state.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Pincode</label>
            <input {...register('pincode')} inputMode="numeric" maxLength={6} className="input-field" placeholder="201301" />
            {errors.pincode && <p className="mt-1 text-xs text-danger font-body">{errors.pincode.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
