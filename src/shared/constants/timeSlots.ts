export const TIME_SLOTS = [
  '05:00', '06:00', '07:00', '08:00',
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00',
] as const

export type TimeSlotValue = typeof TIME_SLOTS[number]

export const DISPLAY_TIMES: Record<string, string> = {
  '05:00': '5 AM',  '06:00': '6 AM',
  '07:00': '7 AM',  '08:00': '8 AM',
  '09:00': '9 AM',  '10:00': '10 AM',
  '11:00': '11 AM', '12:00': '12 PM',
  '13:00': '1 PM',  '14:00': '2 PM',
  '15:00': '3 PM',  '16:00': '4 PM',
  '17:00': '5 PM',  '18:00': '6 PM',
  '19:00': '7 PM',  '20:00': '8 PM',
}

export const START_TIME_SLOTS = TIME_SLOTS.filter((t) => {
  const h = Number(t.split(':')[0])
  return h >= 5 && h <= 12
})

export const END_TIME_SLOTS = TIME_SLOTS.filter((t) => {
  const h = Number(t.split(':')[0])
  return h >= 6 && h <= 20
})

export const WORKING_DAYS = [
  { id: 'mon', order: 1 },
  { id: 'tue', order: 2 },
  { id: 'wed', order: 3 },
  { id: 'thu', order: 4 },
  { id: 'fri', order: 5 },
  { id: 'sat', order: 6 },
  { id: 'sun', order: 7 },
] as const

export type WorkingDayId = typeof WORKING_DAYS[number]['id']

export const SLOT_DURATION_HOURS = 1

export const DEFAULT_WORKING_DAYS: WorkingDayId[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
