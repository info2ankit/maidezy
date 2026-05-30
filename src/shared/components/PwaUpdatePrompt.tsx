import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { ArrowClockwise, X } from '@phosphor-icons/react'

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return
      setInterval(() => r.update().catch(() => {}), 60 * 60 * 1000)
    },
    onRegisterError(err) {
      console.error('SW registration failed', err)
    },
  })

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (needRefresh || offlineReady) {
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [needRefresh, offlineReady])

  function dismiss() {
    setVisible(false)
    setTimeout(() => {
      setNeedRefresh(false)
      setOfflineReady(false)
    }, 300)
  }

  if (!needRefresh && !offlineReady) return null

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {needRefresh ? (
            <>
              <p className="font-heading font-bold text-sm text-gray-800">Update available</p>
              <p className="font-body text-xs text-gray-500 mt-0.5">A new version of MaidEzy is ready.</p>
            </>
          ) : (
            <>
              <p className="font-heading font-bold text-sm text-gray-800">Ready offline</p>
              <p className="font-body text-xs text-gray-500 mt-0.5">App will work without internet.</p>
            </>
          )}
        </div>
        {needRefresh ? (
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="shrink-0 inline-flex items-center gap-1 bg-primary text-white font-body font-semibold text-xs px-3 py-2 rounded-lg active:scale-[0.98]"
          >
            <ArrowClockwise size={14} weight="bold" />
            Reload
          </button>
        ) : (
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            aria-label="Dismiss"
          >
            <X size={14} weight="bold" className="text-gray-500" />
          </button>
        )}
      </div>
    </div>
  )
}
