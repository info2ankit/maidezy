import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PRICING_DEFAULTS } from '@/shared/constants/pricingDefaults'
import { DEFAULT_WORKING_DAYS } from '@/shared/constants/timeSlots'
import type { ServiceTypeId } from '@/shared/constants/serviceTypes'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import type { WorkerShift } from '@/shared/types/worker.types'
import {
  saveWorkerName,
  ensureServiceProviderRow,
  saveWorkerServices,
  saveWorkerPricing,
  saveWorkerAvailability,
} from '@/shared/services/workerProfileService'

export const SETUP_TOTAL_STEPS = 4

interface PricingEntry { monthly: number; perVisit: number }

interface SetupForm {
  workerName:       string
  cityName:         string
  societyIds:       string[]
  selectedServices: ServiceTypeId[]
  pricing:          Record<string, PricingEntry>
  shifts:           WorkerShift[]
  workingDays:      WorkingDayId[]
  currentStep:      number
  errors:           Record<string, string>
}

interface WorkerProfileState {
  setupForm: SetupForm
  isSaving:  boolean
  error:     string | null
}

interface WorkerProfileActions {
  // Step 1
  setName:       (name: string) => void
  setCity:       (city: string) => void
  toggleSociety: (id: string) => void
  // Step 2
  toggleService: (serviceId: ServiceTypeId) => void
  // Step 3
  updatePrice:   (serviceId: ServiceTypeId, mode: 'monthly' | 'perVisit', amount: number) => void
  // Step 4
  addShift:          () => void
  removeShift:       (index: number) => void
  updateShiftStart:  (index: number, time: string) => void
  updateShiftEnd:    (index: number, time: string) => void
  toggleDay:         (day: WorkingDayId) => void
  // Navigation
  nextStep:            () => void
  prevStep:            () => void
  validateCurrentStep: () => boolean
  // Lifecycle
  saveProfile:   (workerId: string) => Promise<void>
  resetSetupForm: () => void
}

const DEFAULT_SHIFT: WorkerShift = { start: '07:00', end: '10:00' }

const INITIAL_FORM: SetupForm = {
  workerName:       '',
  cityName:         '',
  societyIds:       [],
  selectedServices: [],
  pricing:          {},
  shifts:           [{ ...DEFAULT_SHIFT }],
  workingDays:      DEFAULT_WORKING_DAYS,
  currentStep:      1,
  errors:           {},
}

export const useWorkerProfileStore = create<WorkerProfileState & WorkerProfileActions>()(
  persist(
    (set, get) => ({
      setupForm: INITIAL_FORM,
      isSaving:  false,
      error:     null,

      setName: (name) =>
        set((s) => ({
          setupForm: {
            ...s.setupForm,
            workerName: name,
            errors:     { ...s.setupForm.errors, name: '' },
          },
        })),

      setCity: (city) =>
        set((s) => ({
          setupForm: {
            ...s.setupForm,
            cityName:   city,
            societyIds: [],
            errors:     { ...s.setupForm.errors, city: '', society: '' },
          },
        })),

      toggleSociety: (id) =>
        set((s) => {
          const current = s.setupForm.societyIds
          const isSelected = current.includes(id)
          const societyIds = isSelected
            ? current.filter((sid) => sid !== id)
            : current.length < 3
              ? [...current, id]
              : current
          return {
            setupForm: {
              ...s.setupForm,
              societyIds,
              errors: { ...s.setupForm.errors, society: '' },
            },
          }
        }),

      toggleService: (serviceId) =>
        set((s) => {
          const current = s.setupForm.selectedServices
          const isSelected = current.includes(serviceId)
          const selectedServices = isSelected
            ? current.filter((id) => id !== serviceId)
            : [...current, serviceId]

          const pricing = { ...s.setupForm.pricing }
          if (!isSelected && !pricing[serviceId]) {
            pricing[serviceId] = { ...PRICING_DEFAULTS[serviceId] }
          }

          return {
            setupForm: {
              ...s.setupForm,
              selectedServices,
              pricing,
              errors: { ...s.setupForm.errors, services: '' },
            },
          }
        }),

      updatePrice: (serviceId, mode, amount) =>
        set((s) => ({
          setupForm: {
            ...s.setupForm,
            pricing: {
              ...s.setupForm.pricing,
              [serviceId]: {
                ...(s.setupForm.pricing[serviceId] ?? PRICING_DEFAULTS[serviceId]),
                [mode]: amount,
              },
            },
          },
        })),

      addShift: () =>
        set((s) => ({
          setupForm: {
            ...s.setupForm,
            shifts: [...s.setupForm.shifts, { ...DEFAULT_SHIFT }],
            errors: { ...s.setupForm.errors, shifts: '' },
          },
        })),

      removeShift: (index) =>
        set((s) => ({
          setupForm: {
            ...s.setupForm,
            shifts: s.setupForm.shifts.filter((_, i) => i !== index),
          },
        })),

      updateShiftStart: (index, time) =>
        set((s) => {
          const shifts = s.setupForm.shifts.map((sh, i) =>
            i === index ? { ...sh, start: time } : sh,
          )
          return { setupForm: { ...s.setupForm, shifts } }
        }),

      updateShiftEnd: (index, time) =>
        set((s) => {
          const shifts = s.setupForm.shifts.map((sh, i) =>
            i === index ? { ...sh, end: time } : sh,
          )
          return { setupForm: { ...s.setupForm, shifts } }
        }),

      toggleDay: (day) =>
        set((s) => {
          const current = s.setupForm.workingDays
          const workingDays = current.includes(day)
            ? current.filter((d) => d !== day)
            : [...current, day]
          return {
            setupForm: {
              ...s.setupForm,
              workingDays,
              errors: { ...s.setupForm.errors, workingDays: '' },
            },
          }
        }),

      nextStep: () =>
        set((s) => ({
          setupForm: {
            ...s.setupForm,
            currentStep: Math.min(SETUP_TOTAL_STEPS + 1, s.setupForm.currentStep + 1),
          },
        })),

      prevStep: () =>
        set((s) => ({
          setupForm: {
            ...s.setupForm,
            currentStep: Math.max(1, s.setupForm.currentStep - 1),
          },
        })),

      validateCurrentStep: () => {
        const { setupForm } = get()
        const errors: Record<string, string> = {}

        if (setupForm.currentStep === 1) {
          if (!setupForm.workerName.trim()) {
            errors.name = 'errors.enter_name'
          }
          if (!setupForm.cityName) {
            errors.city = 'errors.select_city'
          }
          if (setupForm.societyIds.length === 0) {
            errors.society = 'errors.select_society'
          }
        } else if (setupForm.currentStep === 2) {
          if (setupForm.selectedServices.length === 0) {
            errors.services = 'errors.select_service'
          }
        } else if (setupForm.currentStep === 3) {
          for (const id of setupForm.selectedServices) {
            const p = setupForm.pricing[id]
            if (!p || (p.monthly <= 0 && p.perVisit <= 0)) {
              errors[`price_${id}`] = 'errors.add_price'
            }
          }
        } else if (setupForm.currentStep === 4) {
          const shifts = setupForm.shifts ?? []
          if (shifts.length === 0) {
            errors.shifts = 'errors.add_shift'
          }
          for (const sh of shifts) {
            if (!sh.start || !sh.end || sh.start >= sh.end) {
              errors.shifts = 'errors.end_after_start'
              break
            }
          }
          if (setupForm.workingDays.length === 0) {
            errors.workingDays = 'errors.select_days'
          }
        }

        set((s) => ({ setupForm: { ...s.setupForm, errors } }))
        return Object.keys(errors).length === 0
      },

      saveProfile: async (workerId: string) => {
        const { setupForm } = get()
        set({ isSaving: true, error: null })
        try {
          await saveWorkerName(workerId, setupForm.workerName)
          await ensureServiceProviderRow(workerId, setupForm.societyIds)
          await saveWorkerServices(workerId, setupForm.selectedServices)
          await saveWorkerPricing(workerId, setupForm.pricing as Record<ServiceTypeId, PricingEntry>)
          await saveWorkerAvailability(workerId, {
            shifts:      setupForm.shifts ?? [],
            workingDays: setupForm.workingDays ?? [],
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'errors.save_failed'
          set({ isSaving: false, error: msg })
          throw err
        }
        set({ isSaving: false })
      },

      resetSetupForm: () =>
        set({ setupForm: INITIAL_FORM, isSaving: false, error: null }),
    }),
    {
      name: 'maidezy_worker_profile_setup',
      version: 5,
      migrate: () => ({ setupForm: INITIAL_FORM }),
      partialize: (state) => ({ setupForm: state.setupForm }),
    },
  ),
)
