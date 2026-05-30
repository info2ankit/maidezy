import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Camera, Image, SealCheck, SpinnerGap, CheckCircle,
  Warning, IdentificationCard, WarningCircle, LockSimple,
} from '@phosphor-icons/react'
import { uploadKycFile, upsertKycDocument, fetchKycByUserId } from '@/shared/services/kycService'
import { useAuthStore } from '@/shared/stores/authStore'
import { useProvider } from '../components/ProviderContext'
import KycBadge from '@/shared/components/KycBadge'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import ImageCropModal from '@/shared/components/ImageCropModal'
import type { KycDocument } from '@/shared/types'

type DocKind = 'aadhaar' | 'photo'

// ─── Validation config ────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 5 * 1024 * 1024

const ALLOWED: Record<DocKind, { mimes: string[]; accept: string; acceptCamera: string }> = {
  aadhaar: {
    mimes:        ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    accept:       'image/jpeg,image/jpg,image/png,application/pdf',
    acceptCamera: 'image/*',
  },
  photo: {
    mimes:        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    accept:       'image/jpeg,image/jpg,image/png,image/webp',
    acceptCamera: 'image/*',
  },
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().includes('.pdf')
}

const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// ─── Aadhaar upload slot (document — no crop) ─────────────────────────────────

interface AadhaarSlotProps {
  existingUrl: string | null
  isLocked:    boolean
  onUploaded:  (url: string, oldUrl: string | null) => void
}

function AadhaarSlot({ existingUrl, isLocked, onUploaded }: AadhaarSlotProps) {
  const { t }  = useTranslation('worker')
  const userId = useAuthStore((s) => s.user?.id)

  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!userId) return
    if (!ALLOWED.aadhaar.mimes.includes(file.type.toLowerCase())) {
      setError(t('kyc.file_type_error_aadhaar')); return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(t('kyc.file_size_error_detail', { size: formatBytes(file.size), limit: '5 MB' })); return
    }
    setError(null)
    setUploading(true)
    try {
      const url = await uploadKycFile(userId, 'aadhaar', file, existingUrl)
      onUploaded(url, existingUrl)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''
  }

  const isPdf = existingUrl ? isPdfUrl(existingUrl) : false

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className={[
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          existingUrl ? 'bg-success/10' : 'bg-primary/10',
        ].join(' ')}>
          {existingUrl
            ? <CheckCircle size={20} weight="fill" className="text-success" />
            : <IdentificationCard size={18} weight="duotone" className="text-primary" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-body font-semibold text-gray-800">{t('kyc.aadhaar')}</p>
          <p className="font-body text-xs text-gray-500 mt-0.5">{t('kyc.aadhaar_desc')}</p>
        </div>
      </div>

      {existingUrl && (
        isPdf ? (
          <a href={existingUrl} target="_blank" rel="noopener noreferrer"
            className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
            <IdentificationCard size={28} weight="duotone" className="text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-body text-sm font-semibold text-gray-800">{t('kyc.pdf_uploaded')}</p>
              <p className="font-body text-xs text-accent underline">{t('kyc.view_pdf')}</p>
            </div>
          </a>
        ) : (
          <a href={existingUrl} target="_blank" rel="noopener noreferrer"
            className="block mx-4 mb-3 rounded-xl overflow-hidden border border-gray-100">
            <img src={existingUrl} alt={t('kyc.aadhaar')} className="w-full h-36 object-cover" />
          </a>
        )
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-danger font-body mx-4 mb-3 bg-danger-light border border-danger/20 rounded-xl px-3 py-2.5">
          <WarningCircle size={14} weight="duotone" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLocked ? (
        <LockedBanner />
      ) : (
        <>
          <p className="font-body text-[11px] text-gray-400 mx-4 mb-2">
            {t('kyc.allowed_types_aadhaar')} · {t('kyc.max_size')}
          </p>

          <input ref={cameraRef}  type="file" accept={ALLOWED.aadhaar.acceptCamera} capture="environment" className="hidden" onChange={onChange} />
          <input ref={galleryRef} type="file" accept={ALLOWED.aadhaar.accept} className="hidden" onChange={onChange} />

          <div className={`grid gap-3 px-4 pb-4 ${isTouchDevice ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {isTouchDevice && (
              <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
                {uploading ? <SpinnerGap size={20} weight="bold" className="animate-spin" /> : <Camera size={20} weight="duotone" />}
                <span className="font-body text-xs font-semibold">
                  {uploading ? t('kyc.uploading') : t('kyc.take_photo')}
                </span>
              </button>
            )}
            <button type="button" onClick={() => galleryRef.current?.click()} disabled={uploading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50">
              {uploading && !isTouchDevice ? <SpinnerGap size={18} weight="bold" className="animate-spin" /> : <Image size={18} weight="duotone" />}
              <span className="font-body text-sm font-semibold">
                {uploading && !isTouchDevice ? t('kyc.uploading') : existingUrl ? t('kyc.replace') : t('kyc.upload')}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Profile photo slot (with crop modal) ─────────────────────────────────────

interface PhotoSlotProps {
  existingUrl: string | null
  isLocked:    boolean
  onUploaded:  (url: string, oldUrl: string | null) => void
}

function PhotoSlot({ existingUrl, isLocked, onUploaded }: PhotoSlotProps) {
  const { t }  = useTranslation('worker')
  const userId = useAuthStore((s) => s.user?.id)

  const [rawSrc, setRawSrc]       = useState<string | null>(null)   // image chosen, waiting for crop
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  function readFile(file: File) {
    if (!ALLOWED.photo.mimes.includes(file.type.toLowerCase())) {
      setError(t('kyc.file_type_error_photo')); return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(t('kyc.file_size_error_detail', { size: formatBytes(file.size), limit: '5 MB' })); return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setRawSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ''
  }

  async function handleCropDone(blob: Blob) {
    if (!userId) return
    setRawSrc(null)
    setUploading(true)
    try {
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
      const url  = await uploadKycFile(userId, 'photo', file, existingUrl)
      onUploaded(url, existingUrl)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {/* Crop modal — rendered at root so it covers the full screen */}
      {rawSrc && (
        <ImageCropModal
          imageSrc={rawSrc}
          onDone={handleCropDone}
          onCancel={() => setRawSrc(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <div className={[
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            existingUrl ? 'bg-success/10' : 'bg-primary/10',
          ].join(' ')}>
            {existingUrl
              ? <CheckCircle size={20} weight="fill" className="text-success" />
              : <Camera size={18} weight="duotone" className="text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-body font-semibold text-gray-800">{t('kyc.photo')}</p>
            <p className="font-body text-xs text-gray-500 mt-0.5">{t('kyc.photo_desc')}</p>
          </div>
        </div>

        {/* Preview — circular thumbnail */}
        {existingUrl && (
          <div className="flex justify-center mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-sm">
              <img src={existingUrl} alt={t('kyc.photo')} className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs text-danger font-body mx-4 mb-3 bg-danger-light border border-danger/20 rounded-xl px-3 py-2.5">
            <WarningCircle size={14} weight="duotone" className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLocked ? (
          <LockedBanner />
        ) : (
          <>
            <p className="font-body text-[11px] text-gray-400 mx-4 mb-2">
              {t('kyc.allowed_types_photo')} · {t('kyc.max_size')} · {t('kyc.photo_crop_note')}
            </p>

            <input ref={cameraRef}  type="file" accept={ALLOWED.photo.acceptCamera} capture="user" className="hidden" onChange={onChange} />
            <input ref={galleryRef} type="file" accept={ALLOWED.photo.accept} className="hidden" onChange={onChange} />

            <div className={`grid gap-3 px-4 pb-4 ${isTouchDevice ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {isTouchDevice && (
                <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
                  {uploading ? <SpinnerGap size={20} weight="bold" className="animate-spin" /> : <Camera size={20} weight="duotone" />}
                  <span className="font-body text-xs font-semibold">
                    {uploading ? t('kyc.uploading') : t('kyc.take_photo')}
                  </span>
                </button>
              )}
              <button type="button" onClick={() => galleryRef.current?.click()} disabled={uploading}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50">
                {uploading && !isTouchDevice ? <SpinnerGap size={18} weight="bold" className="animate-spin" /> : <Image size={18} weight="duotone" />}
                <span className="font-body text-sm font-semibold">
                  {uploading && !isTouchDevice ? t('kyc.uploading') : existingUrl ? t('kyc.replace') : t('kyc.upload')}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── Locked banner ────────────────────────────────────────────────────────────

function LockedBanner() {
  const { t } = useTranslation('worker')
  return (
    <div className="mx-4 mb-4 flex items-start gap-3 bg-success/5 border border-success/20 rounded-2xl px-4 py-3">
      <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
        <LockSimple size={16} weight="fill" className="text-success" />
      </div>
      <div>
        <p className="font-body text-sm font-semibold text-gray-800">{t('kyc.locked_title')}</p>
        <p className="font-body text-xs text-gray-500 mt-0.5 leading-relaxed">{t('kyc.locked_body')}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KycPage() {
  const { t } = useTranslation('worker')
  const user  = useAuthStore((s) => s.user)
  const { provider, refresh } = useProvider()

  const [doc, setDoc]             = useState<KycDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchKycByUserId(user.id)
      .then(setDoc)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [user])

  async function handleUploaded(kind: DocKind, url: string) {
    if (!user) return
    const aadhaarUrl = kind === 'aadhaar' ? url : doc?.aadhaar_url ?? null
    const photoUrl   = kind === 'photo'   ? url : doc?.photo_url   ?? null
    try {
      const updated = await upsertKycDocument(user.id, aadhaarUrl, photoUrl)
      setDoc(updated)   // updates preview immediately with new URL
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (isLoading) return <LoadingSpinner />

  const isLocked = provider?.kyc_status === 'approved'

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-800">{t('kyc.title')}</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">{t('kyc.subtitle')}</p>
      </div>

      {/* Status card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <SealCheck size={20} weight="duotone" className="text-primary" />
          </div>
          <div>
            <p className="font-body font-semibold text-gray-800">{t('kyc.status_title')}</p>
            <p className="font-body text-xs text-gray-500 mt-0.5">
              {provider?.kyc_status === 'approved'  && t('kyc.status_approved')}
              {provider?.kyc_status === 'submitted' && t('kyc.status_submitted')}
              {provider?.kyc_status === 'pending'   && t('kyc.status_pending')}
              {provider?.kyc_status === 'rejected'  && t('kyc.status_rejected')}
            </p>
          </div>
        </div>
        {provider && <KycBadge status={provider.kyc_status} />}
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark flex items-start gap-2">
          <Warning size={16} weight="duotone" className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {provider?.kyc_status === 'rejected' && (
        <div className="bg-danger-light border border-danger/30 rounded-2xl px-4 py-3.5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-danger/15 flex items-center justify-center shrink-0">
              <WarningCircle size={18} weight="fill" className="text-danger" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-bold text-danger-dark text-sm">
                {t('kyc.rejected_title', { defaultValue: 'KYC was rejected' })}
              </p>
              {doc?.rejection_notes ? (
                <div className="mt-2 bg-white/70 rounded-xl px-3 py-2 border border-danger/20">
                  <p className="font-body text-[10px] font-bold text-danger uppercase tracking-wider mb-0.5">
                    {t('kyc.rejected_reason_label', { defaultValue: 'Reason' })}
                  </p>
                  <p className="font-body text-xs text-gray-700 leading-snug whitespace-pre-line">
                    {doc.rejection_notes}
                  </p>
                </div>
              ) : (
                <p className="font-body text-xs text-danger-dark/80 mt-1">
                  {t('kyc.rejected_generic', {
                    defaultValue: 'Your documents were not approved. Please re-upload below.',
                  })}
                </p>
              )}
              <p className="font-body text-xs text-gray-600 mt-2">
                {t('kyc.rejected_cta', {
                  defaultValue: 'Replace the rejected documents below and resubmit for review.',
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <AadhaarSlot
          existingUrl={doc?.aadhaar_url ?? null}
          isLocked={isLocked}
          onUploaded={(url) => handleUploaded('aadhaar', url)}
        />
        <PhotoSlot
          existingUrl={doc?.photo_url ?? null}
          isLocked={isLocked}
          onUploaded={(url) => handleUploaded('photo',   url)}
        />
      </div>

      <p className="text-xs text-center text-gray-400 font-body mt-6 px-4">
        {t('kyc.review_note')}
      </p>
    </div>
  )
}
