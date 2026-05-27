import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, User as UserIcon, Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/shared/stores/authStore'
import type { Society } from '@/shared/types'

const profileSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
})

const societySchema = z.object({
  name:    z.string().min(3, 'Min 3 characters'),
  address: z.string().min(5, 'Enter full address'),
  city:    z.string().min(2, 'Required'),
  state:   z.string().min(2, 'Required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode'),
})

type ProfileForm = z.infer<typeof profileSchema>
type SocietyForm = z.infer<typeof societySchema>

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [society, setSociety] = useState<Society | null>(null)
  const [savedFlash, setSavedFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? '' },
  })

  const societyForm = useForm<SocietyForm>({ resolver: zodResolver(societySchema) })

  useEffect(() => {
    if (!user?.society_id) return
    supabase.from('societies').select('*').eq('id', user.society_id).single()
      .then(({ data }) => {
        if (!data) return
        setSociety(data as Society)
        societyForm.reset({
          name:    data.name,
          address: data.address,
          city:    data.city,
          state:   data.state,
          pincode: data.pincode,
        })
      })
  }, [user?.society_id, societyForm])

  function flash(msg: string) {
    setSavedFlash(msg)
    setTimeout(() => setSavedFlash(null), 2000)
  }

  async function onProfileSubmit(data: ProfileForm) {
    if (!user) return
    setError(null)
    const { error: err } = await supabase.from('users').update({ name: data.name }).eq('id', user.id)
    if (err) { setError(err.message); return }
    setUser({ ...user, name: data.name })
    flash('Profile updated')
  }

  async function onSocietySubmit(data: SocietyForm) {
    if (!society) return
    setError(null)
    const { error: err } = await supabase.from('societies').update(data).eq('id', society.id)
    if (err) { setError(err.message); return }
    setSociety({ ...society, ...data })
    flash('Society updated')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-800">Settings</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">Manage your profile and society</p>
      </div>

      {savedFlash && (
        <div className="bg-success-light border border-success/20 rounded-xl px-4 py-2.5 mb-4 text-sm font-body text-success-dark">
          ✓ {savedFlash}
        </div>
      )}
      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {/* Profile card */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <UserIcon size={18} className="text-primary" />
          <h2 className="font-heading font-semibold text-gray-800">My Profile</h2>
        </div>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} noValidate className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input {...profileForm.register('name')} className="input-field" placeholder="Your name" />
            {profileForm.formState.errors.name && (
              <p className="mt-1 text-xs text-danger font-body">{profileForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="label">Mobile Number</label>
            <input value={`+91 ${user?.mobile ?? ''}`} disabled className="input-field bg-gray-50 text-gray-500" />
          </div>
          <button
            type="submit"
            disabled={profileForm.formState.isSubmitting}
            className="btn-primary flex items-center justify-center gap-2 !py-2.5"
          >
            {profileForm.formState.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Profile
          </button>
        </form>
      </div>

      {/* Society card */}
      {society ? (
        <div className="card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Building2 size={18} className="text-primary" />
            <h2 className="font-heading font-semibold text-gray-800">Society Details</h2>
          </div>
          <form onSubmit={societyForm.handleSubmit(onSocietySubmit)} noValidate className="space-y-4">
            <div>
              <label className="label">Society Name</label>
              <input {...societyForm.register('name')} className="input-field" />
              {societyForm.formState.errors.name && (
                <p className="mt-1 text-xs text-danger font-body">{societyForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="label">Address</label>
              <input {...societyForm.register('address')} className="input-field" />
              {societyForm.formState.errors.address && (
                <p className="mt-1 text-xs text-danger font-body">{societyForm.formState.errors.address.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">City</label>
                <input {...societyForm.register('city')} className="input-field" />
              </div>
              <div>
                <label className="label">State</label>
                <input {...societyForm.register('state')} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">Pincode</label>
              <input {...societyForm.register('pincode')} inputMode="numeric" maxLength={6} className="input-field" />
              {societyForm.formState.errors.pincode && (
                <p className="mt-1 text-xs text-danger font-body">{societyForm.formState.errors.pincode.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={societyForm.formState.isSubmitting}
              className="btn-primary flex items-center justify-center gap-2 !py-2.5"
            >
              {societyForm.formState.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Society
            </button>
          </form>
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="font-body text-gray-400 text-sm">No society linked to your account.</p>
        </div>
      )}
    </div>
  )
}
