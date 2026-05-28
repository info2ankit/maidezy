import type { LucideIcon } from 'lucide-react'
import {
  Home, Brush, Utensils, ChefHat, UtensilsCrossed,
  Car, CarFront, Shirt, Sparkles, Baby, HeartPulse,
} from 'lucide-react'
import type { ServiceType } from '@/shared/types'

export const APP_NAME = 'MaidEzy'
export const APP_TAGLINE = 'Your Society. Simplified.'

export const ROUTES = {
  LOGIN: '/login',
  SUPER_ADMIN: '/super-admin',
  RWA_ADMIN: '/rwa-admin',
  SERVICE_PROVIDER: '/provider',
  RESIDENT: '/resident',
} as const

// ─── Service catalog (single source of truth) ─────────────────────────────────

export interface ServiceTypeDef {
  id: ServiceType
  label: string
  icon: LucideIcon
  description?: string
}

export const SERVICE_TYPES: ServiceTypeDef[] = [
  { id: 'maid',            label: 'Maid (Full)',      icon: Home,            description: 'Jhadu + Pocha + Bartan combined' },
  { id: 'jhadu_pocha',     label: 'Jhadu Pocha',      icon: Brush },
  { id: 'bartan',          label: 'Bartan',           icon: Utensils },
  { id: 'cooking_1_meal',  label: 'Cooking · 1 Meal', icon: ChefHat },
  { id: 'cooking_2_meals', label: 'Cooking · 2 Meal', icon: UtensilsCrossed },
  { id: 'car_cleaning',    label: 'Car Cleaning',     icon: Car },
  { id: 'laundry',         label: 'Laundry',          icon: Shirt },
  { id: 'deep_cleaning',   label: 'Deep Cleaning',    icon: Sparkles },
  { id: 'child_care',      label: 'Child Care',       icon: Baby },
  { id: 'elder_care',      label: 'Elder Care',       icon: HeartPulse },
  { id: 'driver',          label: 'Driver',           icon: CarFront },
]

// O(1) lookup map
export const SERVICE_TYPE_BY_ID: Record<ServiceType, ServiceTypeDef> =
  Object.fromEntries(SERVICE_TYPES.map((s) => [s.id, s])) as Record<ServiceType, ServiceTypeDef>

// Backwards-compat: label-only map for callers that just need the string
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> =
  Object.fromEntries(SERVICE_TYPES.map((s) => [s.id, s.label])) as Record<ServiceType, string>

export const KYC_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}
