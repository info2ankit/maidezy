import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WarningCircle, Briefcase } from '@phosphor-icons/react'
import { sendOtp, verifyOtp, fetchRwaAdminMembership } from '@/shared/services/authService'
import { useAuthStore } from '@/shared/stores/authStore'
import { ROUTES } from '@/shared/utils/constants'
import type { Role } from '@/shared/types'
import LanguageToggle from '@/shared/components/LanguageToggle'
import Logo from '@/shared/components/Logo'
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
  const setUser     = useAuthStore((s) => s.setUser)
  const setRwaAdmin = useAuthStore((s) => s.setRwaAdmin)

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

    // For residents, check if they also hold RWA-admin rights and surface
    // that as a capability flag the resident portal can pick up.
    if (result.user.role === 'resident') {
      const m = await fetchRwaAdminMembership(result.user.id)
      setRwaAdmin(m.isRwaAdmin, m.societyIds)
    } else {
      setRwaAdmin(false, [])
    }

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
        <div className="flex justify-center mb-8">
          <Logo height={120} />
        </div>

        {/* Card */}
        <div className="card">
          {/* Step header */}
          <div className="mb-6">
            <h2 className="font-heading text-lg font-semibold text-gray-800">
              {step === 'mobile'
                ? (signupAs === 'service_provider' ? 'Worker Sign In' : 'Login / Sign Up')
                : 'Verify OTP'}
            </h2>
            {step === 'mobile' && (
              <p className="text-sm font-body text-gray-400 mt-0.5">
                Enter your mobile number
              </p>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1.5 flex-1 rounded-full bg-primary transition-all duration-300" />
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

        {/* Footer link: small, discreet entry to worker sign-in (or back to resident) */}
        {step === 'mobile' && (
          <button
            type="button"
            onClick={() => {
              setSignupAs((s) => s === 'service_provider' ? 'resident' : 'service_provider')
              setError(null)
            }}
            className="mt-4 w-full text-center text-xs font-body text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Briefcase size={12} weight="duotone" />
            {signupAs === 'service_provider'
              ? '← Sign in as Resident'
              : 'Are you a worker? Sign in →'}
          </button>
        )}

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
