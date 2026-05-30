import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WarningCircle } from '@phosphor-icons/react'
import { sendOtp, verifyAdminOtp } from '@/shared/services/authService'
import { useAuthStore } from '@/shared/stores/authStore'
import type { Role } from '@/shared/types'
import Logo from '@/shared/components/Logo'
import MobileStep from './components/MobileStep'
import OtpStep from './components/OtpStep'

const adminRedirect: Partial<Record<Role, string>> = {
  super_admin:  '/super-admin',
  worker_admin: '/worker-admin',
}

type Step = 'mobile' | 'otp'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const [step,      setStep]      = useState<Step>('mobile')
  const [mobile,    setMobile]    = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSendOtp(mobileNumber: string) {
    setIsLoading(true)
    setError(null)
    const result = await sendOtp(mobileNumber)
    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setMobile(mobileNumber)
    setStep('otp')
  }

  async function handleVerifyOtp(token: string) {
    setIsLoading(true)
    setError(null)
    const result = await verifyAdminOtp(mobile, token)
    setIsLoading(false)

    if (result.error || !result.user) {
      setError(result.error ?? 'Login failed')
      return
    }

    setUser(result.user)
    const dest = adminRedirect[result.user.role]
    navigate(dest ?? '/login', { replace: true })
  }

  async function handleResend() {
    setError(null)
    await sendOtp(mobile)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo height={100} />
        </div>

        <div className="card">
          <div className="mb-6">
            <h2 className="font-heading text-lg font-semibold text-gray-800">
              {step === 'mobile' ? 'Admin Sign In' : 'Verify OTP'}
            </h2>
            <p className="text-sm font-body text-gray-400 mt-0.5">
              {step === 'mobile'
                ? 'For Super Admin and Worker Admin only.'
                : `Enter the OTP sent to +91 ${mobile}`}
            </p>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="h-1.5 flex-1 rounded-full bg-primary transition-all duration-300" />
            <div className={[
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              step === 'otp' ? 'bg-primary' : 'bg-gray-200',
            ].join(' ')} />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-danger-light border border-danger/20 rounded-xl px-3 py-2.5 mb-4">
              <WarningCircle size={16} className="text-danger mt-0.5 shrink-0" />
              <p className="text-sm font-body text-danger-dark">{error}</p>
            </div>
          )}

          {step === 'mobile' ? (
            <MobileStep onSubmit={handleSendOtp} isLoading={isLoading} />
          ) : (
            <OtpStep
              mobile={mobile}
              onSubmit={handleVerifyOtp}
              onResend={handleResend}
              isLoading={isLoading}
            />
          )}
        </div>

        {step === 'otp' && (
          <button
            type="button"
            onClick={() => { setStep('mobile'); setError(null) }}
            className="mt-4 w-full text-center text-sm font-body text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Change mobile number
          </button>
        )}
      </div>
    </div>
  )
}
