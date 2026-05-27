import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Role } from '@/shared/types'

interface AuthState {
  user: User | null
  role: Role | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User) => void
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

      setUser: (user) =>
        set({ user, role: user.role, isAuthenticated: true, isLoading: false }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({ user: null, role: null, isAuthenticated: false, isLoading: false }),
    }),
    {
      name: 'maidezy-auth',
      partialize: (state) => ({ user: state.user, role: state.role, isAuthenticated: state.isAuthenticated }),
    }
  )
)
