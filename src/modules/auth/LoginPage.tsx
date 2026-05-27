import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { sendOtp, verifyOtp } from '@/shared/services/authService'
import { useAuthStore } from '@/shared/stores/authStore'
import { APP_NAME, APP_TAGLINE, ROUTES } from '@/shared/utils/constants'
import type { Role } from '@/shared/types'
import MobileStep from './components/MobileStep'
import OtpStep from './components/OtpStep'

const roleRedirect: Record<Role, string> = {
  super_admin: ROUTES.SUPER_ADMIN,
  rwa_admin: ROUTES.RWA_ADMIN,
  service_provider: ROUTES.SERVICE_PROVIDER,
  resident: ROUTES.RESIDENT,
}

type Step = 'mobile' | 'otp'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const [step, setStep] = useState<Step>('mobile')
  const [mobile, setMobile] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    const result = await verifyOtp(mobile, token)
    setIsLoading(false)

    if (result.error || !result.user) {
      setError(result.error ?? 'Something went wrong. Please try again.')
      return
    }

    setUser(result.user)
    navigate(roleRedirect[result.user.role], { replace: true })
  }

  async function handleResend() {
    setError(null)
    await sendOtp(mobile)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-card">
            <span className="text-white font-heading font-bold text-2xl">M</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-primary">{APP_NAME}</h1>
          <p className="font-body text-gray-400 text-sm mt-1">{APP_TAGLINE}</p>
        </div>

        {/* Card */}
        <div className="card">
          {/* Step header */}
          <div className="mb-6">
            <h2 className="font-heading text-lg font-semibold text-gray-800">
              {step === 'mobile' ? 'Login / Sign Up' : 'Verify OTP'}
            </h2>
            {step === 'mobile' && (
              <p className="text-sm font-body text-gray-400 mt-0.5">
                Enter your registered mobile number
              </p>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={[
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              'bg-primary',
            ].join(' ')} />
            <div className={[
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              step === 'otp' ? 'bg-primary' : 'bg-gray-200',
            ].join(' ')} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 bg-danger-light border border-danger/20 rounded-xl px-3 py-2.5 mb-4">
              <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" />
              <p className="text-sm font-body text-danger-dark">{error}</p>
            </div>
          )}

          {/* Steps */}
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

        {/* Back link on OTP step */}
        {step === 'otp' && (
          <button
            type="button"
            onClick={() => { setStep('mobile'); setError(null) }}
            className="mt-4 w-full text-center text-sm font-body text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Change mobile number
          </button>
        )}

        {/* Bypass mode notice */}
        {import.meta.env.VITE_APP_ENV !== 'production' && (
          <div className="mt-6 text-center">
            <span className="inline-block bg-accent/10 text-accent text-xs font-semibold font-body px-3 py-1 rounded-full">
              Dev mode — any 6-digit OTP works
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
