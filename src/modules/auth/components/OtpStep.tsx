import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { ShieldCheck, RotateCcw } from 'lucide-react'

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

interface OtpStepProps {
  mobile: string
  onSubmit: (otp: string) => Promise<void>
  onResend: () => Promise<void>
  isLoading: boolean
}

export default function OtpStep({ mobile, onSubmit, onResend, isLoading }: OtpStepProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const [isResending, setIsResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (countdown === 0) return
    const id = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return

    const digit = value.slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((d, i) => { next[i] = d })
    setDigits(next)
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  async function handleResend() {
    setIsResending(true)
    setDigits(Array(OTP_LENGTH).fill(''))
    await onResend()
    setCountdown(RESEND_SECONDS)
    setIsResending(false)
    inputRefs.current[0]?.focus()
  }

  function handleSubmit() {
    const otp = digits.join('')
    if (otp.length === OTP_LENGTH) onSubmit(otp)
  }

  const isComplete = digits.every((d) => d !== '')

  return (
    <div>
      <p className="text-center text-sm font-body text-gray-500 mb-6">
        Enter the 6-digit code sent to{' '}
        <span className="font-semibold text-primary">+91 {mobile}</span>
      </p>

      {/* OTP boxes */}
      <div className="flex justify-center gap-2 mb-6">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className={[
              'w-11 h-13 text-center text-xl font-heading font-bold rounded-xl border-2 transition-all duration-150',
              'focus:outline-none focus:ring-0',
              digit
                ? 'border-primary text-primary bg-primary/5'
                : 'border-gray-200 text-gray-800',
            ].join(' ')}
            style={{ height: '52px' }}
          />
        ))}
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isComplete || isLoading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <ShieldCheck size={18} />
            Verify OTP
          </>
        )}
      </button>

      {/* Resend */}
      <div className="mt-5 text-center">
        {countdown > 0 ? (
          <p className="text-sm font-body text-gray-400">
            Resend OTP in{' '}
            <span className="text-primary font-semibold tabular-nums">
              0:{countdown.toString().padStart(2, '0')}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="flex items-center justify-center gap-1.5 mx-auto text-sm font-semibold text-accent font-body hover:underline disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Resend OTP
          </button>
        )}
      </div>
    </div>
  )
}
