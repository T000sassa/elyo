import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricChipProps {
  label: string
  value: number | string
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: string
  bg?: string
  className?: string
}

export function MetricChip({
  label,
  value,
  unit,
  trend,
  color = '#14b8a6',
  bg = '#f0fdf9',
  className,
}: MetricChipProps) {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div
      className={cn('flex flex-col gap-1 px-4 py-3 rounded-2xl', className)}
      style={{ background: bg }}
    >
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <div className="flex items-baseline gap-1">
        <span
          className="text-xl font-semibold"
          style={{ color, fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs font-normal text-gray-400">{unit}</span>
        )}
        {trend && (
          <TrendIcon
            className="w-3.5 h-3.5 ml-auto"
            style={{ color: trend === 'down' ? '#ef4444' : color }}
          />
        )}
      </div>
    </div>
  )
}
