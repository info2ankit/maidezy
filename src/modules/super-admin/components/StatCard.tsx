import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { staggerItem, SPRING } from '@/shared/utils/motion'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  variant: 'primary' | 'accent' | 'success' | 'purple'
  subtitle?: string
  isLoading?: boolean
}

const variantStyles = {
  primary: { bg: 'bg-primary/10', icon: 'text-primary', value: 'text-primary' },
  accent:  { bg: 'bg-accent/10',  icon: 'text-accent',  value: 'text-accent'  },
  success: { bg: 'bg-success/10', icon: 'text-success', value: 'text-success' },
  purple:  { bg: 'bg-purple-100', icon: 'text-purple-600', value: 'text-purple-600' },
}

function AnimatedCount({ value, className }: { value: number; className: string }) {
  const nodeRef = useRef<HTMLParagraphElement>(null)
  const prevRef = useRef(0)

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return
    const from = prevRef.current
    prevRef.current = value

    const controls = animate(from, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        node.textContent = Math.round(v).toString()
      },
    })
    return () => controls.stop()
  }, [value])

  return <p ref={nodeRef} className={className}>{value}</p>
}

export default function StatCard({ title, value, icon: Icon, variant, subtitle, isLoading }: StatCardProps) {
  const styles = variantStyles[variant]

  return (
    <motion.div
      className="card flex items-center gap-4"
      variants={staggerItem}
      whileHover={{ y: -2, boxShadow: '0 6px 24px rgba(30,58,95,0.12)' }}
      whileTap={{ scale: 0.975 }}
      transition={SPRING}
    >
      <motion.div
        className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', styles.bg)}
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.05 }}
      >
        <Icon size={22} className={styles.icon} />
      </motion.div>
      <div className="min-w-0">
        <p className="font-body text-sm text-gray-500 truncate">{title}</p>
        {isLoading ? (
          <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mt-0.5" />
        ) : typeof value === 'number' ? (
          <AnimatedCount
            value={value}
            className={cn('font-heading text-2xl font-bold leading-tight', styles.value)}
          />
        ) : (
          <p className={cn('font-heading text-2xl font-bold leading-tight', styles.value)}>{value}</p>
        )}
        {subtitle && <p className="font-body text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  )
}
