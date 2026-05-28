import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WarningCircle, Briefcase, House } from '@phosphor-icons/react'
import { sendOtp, verifyOtp } from '@/shared/services/authService'
import { useAuthStore } from '@/shared/stores/authStore'
import { APP_NAME, APP_TAGLINE, ROUTES } from '@/shared/utils/constants'
import { cn } from '@/shared/utils/cn'
import type { Role } from '@/shared/types'
import LanguageToggle from '@/shared/components/LanguageToggle'
import MobileStep from './components/MobileStep'
import OtpStep from './components/OtpStep'

type SignupAs = 'resident' | 'service_provider'

const roleRedirect: Record<Role, string> = {
  super_admin:      ROUTES.SUPER_ADMIN,
  rwa_admin:        ROUTES.RWA_ADMIN,
  worker_admin:     ROUTES.WORKER_ADMIN,
  service_provider: ROUTES.SERVICE_PROVIDER,
  resident:         ROUTES.RESIDENT,
}

type Step = 'mobile' | 'otp'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const [step, setStep] = useState<Step>('mobile')
  const [mobile, setMobile] = useState('')
  const [signupAs, setSignupAs] = useState<SignupAs>('resident')
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
    const result = await verifyOtp(mobile, token, signupAs)
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
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-8 relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
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
              <WarningCircle size={16} className="text-danger mt-0.5 shrink-0" />
              <p className="text-sm font-body text-danger-dark">{error}</p>
            </div>
          )}

          {/* Role picker (mobile step only) */}
          {step === 'mobile' && (
            <div className="mb-5">
              <label className="label">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSignupAs('resident')}
                  className={cn(
                    'flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all duration-150',
                    signupAs === 'resident'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  <House size={20} />
                  <span className="text-sm font-semibold font-body">Resident</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignupAs('service_provider')}
                  className={cn(
                    'flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all duration-150',
                    signupAs === 'service_provider'
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  <Briefcase size={20} />
                  <span className="text-sm font-semibold font-body">Service Provider</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 font-body mt-1.5">
                Only matters for new accounts. Existing users keep their current role.
              </p>
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

      </div>
    </div>
  )
}
