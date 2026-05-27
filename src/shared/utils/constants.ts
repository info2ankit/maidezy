export const APP_NAME = 'MaidEzy'
export const APP_TAGLINE = 'Your Society. Simplified.'

export const ROUTES = {
  LOGIN: '/login',
  SUPER_ADMIN: '/super-admin',
  RWA_ADMIN: '/rwa-admin',
  SERVICE_PROVIDER: '/provider',
  RESIDENT: '/resident',
} as const

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  maid: 'Maid',
  cook: 'Cook',
  driver: 'Driver',
  car_cleaner: 'Car Cleaner',
  home_cleaner: 'Home Cleaner',
  laundry: 'Laundry',
}

export const KYC_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}
