import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WarningCircle, Briefcase } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendOtp, verifyOtp, fetchRwaAdminMembership } from '@/shared/services/authService'
import { useAuthStore } from '@/shared/stores/authStore'
import { ROUTES } from '@/shared/utils/constants'
import { SPRING } from '@/shared/utils/motion'
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
  const [direction, setDirection] = useState(1)
  const [mobile, setMobile] = useState('')
  const [signupAs, setSignupAs] = useState<SignupAs>('resident')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function goTo(next: Step, dir: number) {
    setDirection(dir)
    setStep(next)
  }

  async function handleSendOtp(mobileNumber: string) {
    setIsLoading(true)
    setError(null)
    const result = await sendOtp(mobileNumber)
    setIsLoading(false)
    if (result.error) { setError(result.error); return }
    setMobile(mobileNumber)
    goTo('otp', 1)
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

  const stepVariant = {
    enter:  { x: direction * 44, opacity: 0 },
    center: { x: 0, opacity: 1, transition: SPRING },
    exit:   { x: direction * -44, opacity: 0, transition: { duration: 0.16 } },
  }

  return (
    <motion.div
      className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-8 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand header */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.05 }}
        >
          <Logo height={120} />
        </motion.div>

        {/* Card */}
        <motion.div
          className="card overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28, delay: 0.12 }}
        >
          {/* Step header */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step + '-header'}
              className="mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
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
              {step === 'otp' && (
                <p className="text-sm font-body text-gray-400 mt-0.5">
                  Sent to +91 {mobile}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1.5 flex-1 rounded-full bg-primary transition-all duration-300" />
            <motion.div
              className="h-1.5 flex-1 rounded-full"
              animate={{ backgroundColor: step === 'otp' ? '#1E3A5F' : '#E5E7EB' }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="flex items-start gap-2 bg-danger-light border border-danger/20 rounded-xl px-3 py-2.5 mb-4"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={SPRING}
              >
                <WarningCircle size={16} className="text-danger mt-0.5 shrink-0" />
                <p className="text-sm font-body text-danger-dark">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Steps — directional slide */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              {step === 'mobile' ? (
                <motion.div
                  key="mobile"
                  custom={direction}
                  variants={stepVariant}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <MobileStep onSubmit={handleSendOtp} isLoading={isLoading} />
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  custom={direction}
                  variants={stepVariant}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <OtpStep
                    mobile={mobile}
                    onSubmit={handleVerifyOtp}
                    onResend={handleResend}
                    isLoading={isLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer links */}
        <AnimatePresence mode="wait" initial={false}>
          {step === 'mobile' ? (
            <motion.button
              key="worker-link"
              type="button"
              onClick={() => { setSignupAs((s) => s === 'service_provider' ? 'resident' : 'service_provider'); setError(null) }}
              className="mt-4 w-full text-center text-xs font-body text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center justify-center gap-1.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <Briefcase size={12} weight="duotone" />
              {signupAs === 'service_provider' ? '← Sign in as Resident' : 'Are you a worker? Sign in →'}
            </motion.button>
          ) : (
            <motion.button
              key="back-link"
              type="button"
              onClick={() => { goTo('mobile', -1); setError(null) }}
              className="mt-4 w-full text-center text-sm font-body text-gray-400 hover:text-gray-600 transition-colors"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              ← Change mobile number
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
