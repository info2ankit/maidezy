import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Phone } from 'lucide-react'

const schema = z.object({
  mobile: z
    .string()
    .regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
})

type FormData = z.infer<typeof schema>

interface MobileStepProps {
  onSubmit: (mobile: string) => Promise<void>
  isLoading: boolean
}

export default function MobileStep({ onSubmit, isLoading }: MobileStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d.mobile))} noValidate>
      <div className="mb-6">
        <label className="label">Mobile Number</label>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 shrink-0">
            <span className="text-lg leading-none">🇮🇳</span>
            <span className="font-body text-gray-600 font-semibold text-sm">+91</span>
          </div>
          <input
            {...register('mobile')}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="98765 43210"
            className="input-field flex-1"
            autoFocus
          />
        </div>
        {errors.mobile && (
          <p className="mt-1.5 text-sm text-danger font-body">{errors.mobile.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Phone size={18} />
            Send OTP
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400 font-body mt-4 leading-relaxed">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  )
}
