import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ShieldCheck, ShieldWarning, CheckCircle, Circle, Lock, HourglassMedium } from '@phosphor-icons/react'
import type { KycStatus } from '@/shared/types'

interface Props {
  status: KycStatus
}

export default function KycNudgeBanner({ status }: Props) {
  const { t } = useTranslation('worker')

  if (status === 'approved') return null

  const isRejected  = status === 'rejected'
  const isSubmitted = status === 'submitted'

  // ── Submitted: clean neutral card — no colour noise, content is readable ──
  if (isSubmitted) {
    return (
      <div className="mb-4 rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <HourglassMedium size={22} weight="duotone" className="text-primary" />
          </div>
          <div>
            <p className="font-heading font-bold text-gray-800 text-base leading-tight">
              {t('kyc.nudge_submitted_headline')}
            </p>
            <p className="font-body text-gray-500 text-xs mt-1 leading-relaxed">
              {t('kyc.nudge_submitted_body')}
            </p>
          </div>
        </div>

        {/* Minimal step trail in muted colours */}
        <div className="flex items-center gap-0 mb-4">
          <StepMuted icon={<CheckCircle size={15} weight="fill" className="text-primary" />} label={t('kyc.step_profile')} done />
          <ConnectorMuted done />
          <StepMuted icon={<HourglassMedium size={15} weight="duotone" className="text-primary animate-pulse" />} label={t('kyc.step_kyc')} active />
          <ConnectorMuted />
          <StepMuted icon={<Lock size={13} weight="duotone" className="text-gray-300" />} label={t('kyc.step_earn')} faded />
        </div>

        <Link
          to="/provider/kyc"
          className="block w-full text-center bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 font-heading font-bold text-sm text-primary transition-colors hover:bg-primary/10"
        >
          {t('kyc.nudge_submitted_cta')} →
        </Link>
      </div>
    )
  }

  // ── Pending / Rejected: coloured gradient cards ───────────────────────────
  return (
    <div className="relative mb-4 rounded-2xl overflow-hidden shadow-sm">
      <div className={[
        'absolute inset-0',
        isRejected
          ? 'bg-gradient-to-br from-red-500 to-red-700'
          : 'bg-gradient-to-br from-[#F97316] via-[#fb923c] to-[#ea580c]',
      ].join(' ')} />

      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />

      <div className="relative px-5 pt-5 pb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
            {isRejected
              ? <ShieldWarning size={22} weight="fill" className="text-white" />
              : <ShieldCheck size={22} weight="fill" className="text-white" />}
          </div>
          <div>
            <p className="font-heading font-bold text-white text-base leading-tight">
              {isRejected ? t('kyc.nudge_rejected_headline') : t('kyc.nudge_headline')}
            </p>
            <p className="font-body text-white/80 text-xs mt-1 leading-relaxed">
              {isRejected ? t('kyc.nudge_rejected_body') : t('kyc.nudge_body')}
            </p>
          </div>
        </div>

        {!isRejected && (
          <div className="flex items-center gap-0 mb-4 mt-2">
            <Step icon={<CheckCircle size={16} weight="fill" className="text-white" />} label={t('kyc.step_profile')} done />
            <Connector />
            <Step icon={<Circle size={16} weight="fill" className="text-white/40" />} label={t('kyc.step_kyc')} active />
            <Connector faded />
            <Step icon={<Lock size={14} weight="duotone" className="text-white/50" />} label={t('kyc.step_earn')} faded />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-1">
          {!isRejected && (
            <div className="bg-white/20 rounded-xl px-3 py-2 text-center shrink-0">
              <p className="font-heading font-bold text-white text-sm leading-none">{t('kyc.nudge_stat')}</p>
              <p className="font-body text-white/70 text-[10px] mt-0.5">{t('kyc.nudge_stat_label')}</p>
            </div>
          )}
          <Link
            to="/provider/kyc"
            className="flex-1 text-center bg-white rounded-xl px-4 py-2.5 font-heading font-bold text-sm transition-opacity hover:opacity-90 active:opacity-80"
            style={{ color: isRejected ? '#dc2626' : '#F97316' }}
          >
            {isRejected ? t('kyc.nudge_rejected_cta') : t('kyc.nudge_cta')} →
          </Link>
        </div>
      </div>
    </div>
  )
}

function Step({ icon, label, done, active, faded }: {
  icon:    React.ReactNode
  label:   string
  done?:   boolean
  active?: boolean
  faded?:  boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[56px]">
      <div className={[
        'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
        done   ? 'bg-white/30 border-white'              : '',
        active ? 'bg-white/20 border-white animate-pulse' : '',
        faded  ? 'bg-white/5  border-white/30'           : '',
      ].join(' ')}>
        {icon}
      </div>
      <span className={[
        'font-body text-[10px] font-semibold',
        faded ? 'text-white/40' : 'text-white/90',
      ].join(' ')}>
        {label}
      </span>
    </div>
  )
}

function Connector({ faded }: { faded?: boolean }) {
  return (
    <div className={[
      'flex-1 h-0.5 mb-4',
      faded ? 'bg-white/20' : 'bg-white/60',
    ].join(' ')} />
  )
}

// ── Neutral step + connector for the submitted card ───────────────────────────

function StepMuted({ icon, label, done, active, faded }: {
  icon:    React.ReactNode
  label:   string
  done?:   boolean
  active?: boolean
  faded?:  boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[56px]">
      <div className={[
        'w-8 h-8 rounded-full flex items-center justify-center border-2',
        done   ? 'bg-primary/10 border-primary'    : '',
        active ? 'bg-primary/10 border-primary'    : '',
        faded  ? 'bg-gray-50   border-gray-200'    : '',
      ].join(' ')}>
        {icon}
      </div>
      <span className={[
        'font-body text-[10px] font-semibold',
        faded ? 'text-gray-300' : 'text-gray-500',
      ].join(' ')}>
        {label}
      </span>
    </div>
  )
}

function ConnectorMuted({ done }: { done?: boolean }) {
  return (
    <div className={[
      'flex-1 h-0.5 mb-4',
      done ? 'bg-primary/40' : 'bg-gray-200',
    ].join(' ')} />
  )
}
