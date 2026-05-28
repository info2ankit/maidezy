import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, ImageIcon, FileCheck, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { uploadKycFile, upsertKycDocument, fetchKycByUserId } from '@/shared/services/kycService'
import { useAuthStore } from '@/shared/stores/authStore'
import { useProvider } from '../components/ProviderContext'
import KycBadge from '@/shared/components/KycBadge'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import type { KycDocument } from '@/shared/types'

type DocKind = 'aadhaar' | 'photo'

interface UploadSlotProps {
  kind:        DocKind
  label:       string
  description: string
  icon:        typeof FileText
  captureMode: 'environment' | 'user'
  existingUrl: string | null
  onUploaded:  (url: string) => void
}

const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

function UploadSlot({ kind, label, description, icon: Icon, captureMode, existingUrl, onUploaded }: UploadSlotProps) {
  const { t } = useTranslation('worker')
  const userId = useAuthStore((s) => s.user?.id)

  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!userId) return
    if (file.size > 5 * 1024 * 1024) { setError(t('kyc.file_size_error')); return }

    setError(null)
    setUploading(true)
    try {
      const url = await uploadKycFile(userId, kind, file)
      onUploaded(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    // Reset so the same file can be re-selected after an error
    e.target.value = ''
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className={[
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          existingUrl ? 'bg-success/10' : 'bg-primary/10',
        ].join(' ')}>
          {existingUrl
            ? <CheckCircle2 size={20} className="text-success" />
            : <Icon size={18} className="text-primary" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-body font-semibold text-gray-800">{label}</p>
          <p className="font-body text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      {/* Preview */}
      {existingUrl && (
        <a
          href={existingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mx-4 mb-3 rounded-xl overflow-hidden border border-gray-100"
        >
          <img src={existingUrl} alt={label} className="w-full h-36 object-cover" />
        </a>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-danger font-body mx-4 mb-3">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture={captureMode}
        className="hidden"
        onChange={onInputChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />

      {/* Action buttons */}
      <div className={`grid gap-3 px-4 pb-4 ${isTouchDevice ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Camera — only on touch devices (mobile/tablet) */}
        {isTouchDevice && (
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Camera size={20} />
            )}
            <span className="font-body text-xs font-semibold">
              {uploading ? t('kyc.uploading') : t('kyc.take_photo')}
            </span>
          </button>
        )}

        {/* Gallery / file upload — always shown */}
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {uploading && !isTouchDevice
            ? <Loader2 size={18} className="animate-spin" />
            : <ImageIcon size={18} />}
          <span className="font-body text-sm font-semibold">
            {uploading && !isTouchDevice
              ? t('kyc.uploading')
              : existingUrl
                ? t('kyc.replace')
                : t('kyc.upload')}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function KycPage() {
  const { t } = useTranslation('worker')
  const user = useAuthStore((s) => s.user)
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
      setDoc(updated)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (isLoading) return <LoadingSpinner />

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
            <FileCheck size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-body font-semibold text-gray-800">{t('kyc.status_title')}</p>
            <p className="font-body text-xs text-gray-500 mt-0.5">
              {provider?.kyc_status === 'approved' && t('kyc.status_approved')}
              {provider?.kyc_status === 'pending'  && t('kyc.status_pending')}
              {provider?.kyc_status === 'rejected' && t('kyc.status_rejected')}
            </p>
          </div>
        </div>
        {provider && <KycBadge status={provider.kyc_status} />}
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <UploadSlot
          kind="aadhaar"
          label={t('kyc.aadhaar')}
          description={t('kyc.aadhaar_desc')}
          icon={FileText}
          captureMode="environment"
          existingUrl={doc?.aadhaar_url ?? null}
          onUploaded={(url) => handleUploaded('aadhaar', url)}
        />
        <UploadSlot
          kind="photo"
          label={t('kyc.photo')}
          description={t('kyc.photo_desc')}
          icon={Camera}
          captureMode="user"
          existingUrl={doc?.photo_url ?? null}
          onUploaded={(url) => handleUploaded('photo', url)}
        />
      </div>

      <p className="text-xs text-center text-gray-400 font-body mt-6 px-4">
        {t('kyc.review_note')}
      </p>
    </div>
  )
}
