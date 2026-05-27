import { APP_NAME, APP_TAGLINE } from '@/shared/utils/constants'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-heading text-3xl font-bold text-primary">{APP_NAME}</h1>
          <p className="font-body text-gray-500 mt-1">{APP_TAGLINE}</p>
        </div>
        <div className="card">
          <p className="text-center text-gray-400 font-body">
            Auth module coming in Phase 2
          </p>
        </div>
      </div>
    </div>
  )
}
