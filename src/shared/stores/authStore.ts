import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Role } from '@/shared/types'

interface AuthState {
  user: User | null
  role: Role | null
  isAuthenticated: boolean
  isLoading: boolean
  /** True when this resident has an entry in rwa_admins. Lets the resident
   *  portal expose an "Admin" tab without making them a separate role. */
  isRwaAdmin: boolean
  rwaSocietyIds: string[]
  setUser: (user: User) => void
  setRwaAdmin: (isRwaAdmin: boolean, societyIds?: string[]) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: true,
      isRwaAdmin: false,
      rwaSocietyIds: [],

      setUser: (user) =>
        set({ user, role: user.role, isAuthenticated: true, isLoading: false }),

      setRwaAdmin: (isRwaAdmin, societyIds = []) =>
        set({ isRwaAdmin, rwaSocietyIds: societyIds }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({
          user: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
          isRwaAdmin: false,
          rwaSocietyIds: [],
        }),
    }),
    {
      name: 'maidezy-auth',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
        isRwaAdmin: state.isRwaAdmin,
        rwaSocietyIds: state.rwaSocietyIds,
      }),
    }
  )
)
