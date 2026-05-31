import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Resident, ResidentSavedAddress } from '@/shared/types'

interface ResidentState {
  resident: Resident | null
  pendingCount: number
  activeAddress: ResidentSavedAddress | null  // null = home (registered society)
  setResident: (r: Resident) => void
  clearResident: () => void
  setPendingCount: (n: number) => void
  incPendingCount: () => void
  decPendingCount: () => void
  setActiveAddress: (a: ResidentSavedAddress | null) => void
}

export const useResidentStore = create<ResidentState>()(
  persist(
    (set) => ({
      resident: null,
      pendingCount: 0,
      activeAddress: null,
      setResident: (r) => set({ resident: r }),
      clearResident: () => set({ resident: null, activeAddress: null }),
      setPendingCount: (n) => set({ pendingCount: Math.max(0, n) }),
      incPendingCount: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
      decPendingCount: () => set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),
      setActiveAddress: (a) => set({ activeAddress: a }),
    }),
    {
      name: 'resident-profile',
      partialize: (state) => ({ resident: state.resident, activeAddress: state.activeAddress }),
    },
  ),
)
