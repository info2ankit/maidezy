import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Resident } from '@/shared/types'

interface ResidentState {
  resident: Resident | null
  setResident: (r: Resident) => void
  clearResident: () => void
}

export const useResidentStore = create<ResidentState>()(
  persist(
    (set) => ({
      resident: null,
      setResident: (r) => set({ resident: r }),
      clearResident: () => set({ resident: null }),
    }),
    {
      name: 'resident-profile',
      partialize: (state) => ({ resident: state.resident }),
    },
  ),
)
