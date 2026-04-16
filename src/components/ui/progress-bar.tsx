'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Milestone {
  value: number   // 0–100 as percentage
  label: string
}

interface ProgressBarProps {
  value: number   // 0–100
  label?: string
  sublabel?: string
  milestones?: Milestone[]
  color?: string
  animate?: boolean
  className?: string
}

export function ProgressBar({
  value,
  label,
  sublabel,
  milestones = [],
  color = '#14b8a6',
  animate = true,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100)
  const [width, setWidth] = useState(animate ? 0 : clamped)

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => setWidth(clamped), 100)
    return () => clearTimeout(timer)
  }, [clamped, animate])

  return (
    <div className={cn('space-y-2', className)}>
      {(label || sublabel) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
        </div>
      )}
      <div className="relative h-2.5 w-full rounded-full bg-gray-100">
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${width}%`,
            background: color,
            transition: animate ? 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s' : 'none',
          }}
        />
        {/* Milestone markers */}
        {milestones.map((m) => (
          <div
            key={m.value}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-4 rounded-full"
            style={{
              left: `${m.value}%`,
              background: clamped >= m.value ? color : '#d1d5db',
            }}
            title={m.label}
          />
        ))}
      </div>
      {milestones.length > 0 && (
        <div className="relative h-4">
          {milestones.map((m) => (
            <span
              key={m.value}
              className="absolute text-[10px] text-gray-400 -translate-x-1/2"
              style={{ left: `${m.value}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
