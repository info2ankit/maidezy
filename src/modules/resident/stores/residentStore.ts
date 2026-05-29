import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Resident } from '@/shared/types'

interface ResidentState {
  resident: Resident | null
  pendingCount: number
  setResident: (r: Resident) => void
  clearResident: () => void
  setPendingCount: (n: number) => void
  incPendingCount: () => void
  decPendingCount: () => void
}

export const useResidentStore = create<ResidentState>()(
  persist(
    (set) => ({
      resident: null,
      pendingCount: 0,
      setResident: (r) => set({ resident: r }),
      clearResident: () => set({ resident: null }),
      setPendingCount: (n) => set({ pendingCount: Math.max(0, n) }),
      incPendingCount: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
      decPendingCount: () => set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),
    }),
    {
      name: 'resident-profile',
      partialize: (state) => ({ resident: state.resident }),
    },
  ),
)
