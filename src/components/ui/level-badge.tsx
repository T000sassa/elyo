import { cn } from '@/lib/utils'

export type Level = 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

const LEVEL_STYLES: Record<Level, { bg: string; text: string; border: string; label: string }> = {
  STARTER:  { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb',  label: 'Starter'  },
  BRONZE:   { bg: '#fef3c7', text: '#92400e', border: '#fde68a',  label: 'Bronze'   },
  SILVER:   { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1',  label: 'Silver'   },
  GOLD:     { bg: '#fffbeb', text: '#b45309', border: '#fcd34d',  label: 'Gold'     },
  PLATINUM: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe',  label: 'Platinum' },
}

interface LevelBadgeProps {
  level: Level
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  const style = LEVEL_STYLES[level]
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium tracking-wide',
        sizeClasses[size],
        className,
      )}
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      {style.label}
    </span>
  )
}
