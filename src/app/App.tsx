import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { router } from './router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/shared/stores/authStore'
import type { User } from '@/shared/types'

export default function App() {
  const { setUser, setLoading, logout } = useAuthStore()

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) setUser(profile as User)
        else setLoading(false)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          logout()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setLoading, logout])

  return <RouterProvider router={router} />
}
