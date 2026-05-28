import {
  Broom, Drop, ForkKnife, CookingPot, Car,
  WashingMachine, Baby, PersonSimpleWalk, Sparkle, Clock,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

export type ServiceTypeId =
  | 'maid' | 'jhadu_pocha' | 'bartan' | 'cooking' | 'car_cleaning'
  | 'laundry' | 'child_care' | 'elder_care' | 'deep_cleaning' | 'full_time'

export const SERVICE_TYPES: Array<{ id: ServiceTypeId; icon: Icon; labelKey: string }> = [
  { id: 'maid',          icon: Broom,            labelKey: 'services.maid'          },
  { id: 'jhadu_pocha',   icon: Drop,             labelKey: 'services.jhadu_pocha'   },
  { id: 'bartan',        icon: ForkKnife,        labelKey: 'services.bartan'        },
  { id: 'cooking',       icon: CookingPot,       labelKey: 'services.cooking'       },
  { id: 'car_cleaning',  icon: Car,              labelKey: 'services.car_cleaning'  },
  { id: 'laundry',       icon: WashingMachine,   labelKey: 'services.laundry'       },
  { id: 'child_care',    icon: Baby,             labelKey: 'services.child_care'    },
  { id: 'elder_care',    icon: PersonSimpleWalk, labelKey: 'services.elder_care'    },
  { id: 'deep_cleaning', icon: Sparkle,          labelKey: 'services.deep_cleaning' },
  { id: 'full_time',     icon: Clock,            labelKey: 'services.full_time'     },
]

export const SERVICE_TYPE_BY_ID = Object.fromEntries(
  SERVICE_TYPES.map((s) => [s.id, s]),
) as Record<ServiceTypeId, { id: ServiceTypeId; icon: Icon; labelKey: string }>
