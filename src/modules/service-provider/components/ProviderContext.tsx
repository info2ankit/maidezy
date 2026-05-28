import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchProviderByUserId } from '@/shared/services/serviceProviderService'
import { useAuthStore } from '@/shared/stores/authStore'
import type { ProviderWithServices } from '@/shared/types'

interface ProviderContextValue {
  provider: ProviderWithServices | null
  isLoading: boolean
  refresh: () => Promise<void>
  setProvider: (p: ProviderWithServices) => void
}

const ProviderContext = createContext<ProviderContextValue | null>(null)

export function ProviderProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id)
  const [provider, setProvider] = useState<ProviderWithServices | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function refresh() {
    if (!userId) return
    setIsLoading(true)
    try {
      const data = await fetchProviderByUserId(userId)
      setProvider(data)
    } catch (err) {
      // Don't lock the user out — log and treat as "no provider yet"
      console.error('[ProviderContext] refresh failed:', err)
      setProvider(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { refresh() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [userId])

  return (
    <ProviderContext.Provider value={{ provider, isLoading, refresh, setProvider }}>
      {children}
    </ProviderContext.Provider>
  )
}

export function useProvider() {
  const ctx = useContext(ProviderContext)
  if (!ctx) throw new Error('useProvider must be used inside ProviderProvider')
  return ctx
}
