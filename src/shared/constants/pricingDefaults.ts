import type { ServiceTypeId } from './serviceTypes'

export const PRICING_DEFAULTS: Record<ServiceTypeId, { monthly: number; perVisit: number }> = {
  maid:          { monthly: 1800, perVisit: 80  },
  jhadu_pocha:   { monthly: 800,  perVisit: 40  },
  bartan:        { monthly: 600,  perVisit: 30  },
  cooking:       { monthly: 1500, perVisit: 70  },
  car_cleaning:  { monthly: 500,  perVisit: 30  },
  laundry:       { monthly: 600,  perVisit: 35  },
  child_care:    { monthly: 3000, perVisit: 150 },
  elder_care:    { monthly: 4000, perVisit: 200 },
  deep_cleaning: { monthly: 0,    perVisit: 800 },
  full_time:     { monthly: 8000, perVisit: 0   },
}
