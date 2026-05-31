import type { Transition, Variants } from 'framer-motion'

// ── Spring presets ────────────────────────────────────────────────────────────

export const SPRING: Transition = { type: 'spring', stiffness: 400, damping: 34 }
export const SPRING_GENTLE: Transition = { type: 'spring', stiffness: 280, damping: 28 }
export const SPRING_SNAPPY: Transition = { type: 'spring', stiffness: 600, damping: 30 }
export const SPRING_SLOW: Transition = { type: 'spring', stiffness: 220, damping: 26 }

// ── Shared variants ───────────────────────────────────────────────────────────

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: SPRING },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.22 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show:   { opacity: 1, scale: 1,    transition: SPRING_GENTLE },
  exit:   { opacity: 0, scale: 0.94, transition: { duration: 0.14 } },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: '100%' },
  show:   { opacity: 1, y: 0,      transition: SPRING_GENTLE },
  exit:   { opacity: 0, y: '100%', transition: { type: 'spring', stiffness: 380, damping: 36 } },
}

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.2 } },
  exit:   { opacity: 0, transition: { duration: 0.22, delay: 0.04 } },
}

// ── Stagger container ─────────────────────────────────────────────────────────

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

export const staggerContainerFast: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.02 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: SPRING },
}

export const staggerItemLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  show:   { opacity: 1, x: 0,  transition: SPRING },
}

// ── Page-level step transitions (e.g. multi-step forms) ───────────────────────

export function stepVariants(direction: number): Variants {
  return {
    enter:  { x: direction > 0 ? 48 : -48, opacity: 0 },
    center: { x: 0, opacity: 1, transition: SPRING },
    exit:   { x: direction > 0 ? -48 : 48, opacity: 0, transition: { duration: 0.18 } },
  }
}
