import { useState, useCallback } from 'react'
import EasyCrop from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

// ─── Canvas crop utility ──────────────────────────────────────────────────────

const OUTPUT_SIZE = 400   // px — square, good for thumbnails

export async function getCroppedBlob(src: string, cropPx: Area): Promise<Blob> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = src
  await new Promise<void>((res, rej) => {
    img.onload  = () => res()
    img.onerror = () => rej(new Error('Image load failed'))
  })

  const canvas = document.createElement('canvas')
  canvas.width  = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    img,
    cropPx.x, cropPx.y, cropPx.width, cropPx.height,
    0, 0, OUTPUT_SIZE, OUTPUT_SIZE,
  )

  return new Promise<Blob>((res, rej) => {
    canvas.toBlob(
      (blob) => (blob ? res(blob) : rej(new Error('Crop failed'))),
      'image/jpeg',
      0.88,
    )
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  imageSrc:  string
  onDone:    (blob: Blob) => void
  onCancel:  () => void
}

export default function ImageCropModal({ imageSrc, onDone, onCancel }: Props) {
  const { t } = useTranslation('worker')

  const [crop, setCrop]               = useState({ x: 0, y: 0 })
  const [zoom, setZoom]               = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [processing, setProcessing]   = useState(false)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedArea) return
    setProcessing(true)
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea)
      onDone(blob)
    } catch {
      /* surface nothing — parent can surface upload errors */
    } finally {
      setProcessing(false)
    }
  }

  return (
    /* Full-screen overlay */
    <div className="fixed inset-0 z-50 flex flex-col bg-black">

      {/* Crop area — takes all remaining height */}
      <div className="relative flex-1">
        <EasyCrop
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle:  { border: '3px solid #F97316' },
          }}
        />

        {/* Tip */}
        <p className="absolute top-4 left-0 right-0 text-center text-white/70 text-xs font-body pointer-events-none">
          {t('kyc.crop_hint')}
        </p>
      </div>

      {/* Zoom slider */}
      <div className="px-6 py-3 bg-black/80">
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-accent"
          aria-label="Zoom"
        />
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-8 pt-2 bg-black/90">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="h-12 rounded-2xl border border-white/20 text-white font-heading font-semibold text-sm hover:bg-white/10 transition-colors disabled:opacity-40"
        >
          {t('profile.back')}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={processing}
          className="h-12 rounded-2xl bg-accent text-white font-heading font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {processing && <Loader2 size={16} className="animate-spin" />}
          {t('kyc.crop_save')}
        </button>
      </div>

    </div>
  )
}
