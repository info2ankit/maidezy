export const SERVICE_TYPES = [
  { id: 'maid',          emoji: '🧹', labelKey: 'services.maid'          },
  { id: 'jhadu_pocha',   emoji: '🪣', labelKey: 'services.jhadu_pocha'   },
  { id: 'bartan',        emoji: '🍽️', labelKey: 'services.bartan'        },
  { id: 'cooking',       emoji: '🍳', labelKey: 'services.cooking'       },
  { id: 'car_cleaning',  emoji: '🚗', labelKey: 'services.car_cleaning'  },
  { id: 'laundry',       emoji: '👕', labelKey: 'services.laundry'       },
  { id: 'child_care',    emoji: '👶', labelKey: 'services.child_care'    },
  { id: 'elder_care',    emoji: '👴', labelKey: 'services.elder_care'    },
  { id: 'deep_cleaning', emoji: '🏠', labelKey: 'services.deep_cleaning' },
  { id: 'full_time',     emoji: '⏰', labelKey: 'services.full_time'     },
] as const

export type ServiceTypeId = typeof SERVICE_TYPES[number]['id']

export const SERVICE_TYPE_BY_ID = Object.fromEntries(
  SERVICE_TYPES.map((s) => [s.id, s]),
) as Record<ServiceTypeId, typeof SERVICE_TYPES[number]>
