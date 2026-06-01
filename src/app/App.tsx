import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { router } from './router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/shared/stores/authStore'
import type { User } from '@/shared/types'

export default function App() {
  const { setUser, setLoading, logout } = useAuthStore()
  const { i18n } = useTranslation()

  // Keep <html lang> in sync with the current language for a11y + font fallbacks
  useEffect(() => {
    const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'hi').split('-')[0]
    document.documentElement.lang = lang
  }, [i18n.resolvedLanguage, i18n.language])

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Residents/workers: public.users.id = session.user.id (direct match).
        // Admins: public.users.id ≠ session.user.id; look up by auth_id instead.
        const { data: byId } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        let profile = byId
        if (!profile) {
          const { data: byAuthId } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', session.user.id)
            .maybeSingle()
          profile = byAuthId
        }

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
