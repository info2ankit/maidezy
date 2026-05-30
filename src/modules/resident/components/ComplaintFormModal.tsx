import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'

interface Props {
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (input: { title: string; description: string }) => void
}

export default function ComplaintFormModal({ isSubmitting, onClose, onSubmit }: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  function handleSubmit() {
    if (!title.trim() || !description.trim()) return
    onSubmit({ title: title.trim(), description: description.trim() })
  }

  const canSubmit = title.trim().length > 2 && description.trim().length > 5 && !isSubmitting

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0 border-b border-gray-100">
          <div>
            <h2 className="font-heading font-bold text-gray-900 text-lg">File a complaint</h2>
            <p className="font-body text-xs text-gray-400 mt-0.5">
              Your RWA admin will review and respond
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={16} weight="bold" className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div>
            <label className="block font-body text-xs font-semibold text-gray-600 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary"
              maxLength={80}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 font-body text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-gray-600 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? Include dates, times, names if useful."
              maxLength={500}
              rows={5}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 font-body text-sm text-gray-700 outline-none placeholder:text-gray-400 resize-none"
            />
            <p className="font-body text-[10px] text-gray-400 mt-1 text-right">
              {description.length}/500
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 px-5 py-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-accent text-white font-body font-semibold py-3 rounded-2xl text-sm hover:bg-accent-600 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting…' : 'Submit complaint'}
          </button>
        </div>
      </div>
    </>
  )
}
