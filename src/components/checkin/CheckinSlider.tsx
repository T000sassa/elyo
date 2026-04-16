'use client'

import { cn } from '@/lib/utils'

interface CheckinSliderProps {
  label: string
  iconLow: string
  iconHigh: string
  value: number
  onChange: (v: number) => void
  inverted?: boolean  // if true, high = bad (stress slider)
}

function sliderColor(value: number, inverted: boolean): string {
  const effective = inverted ? 11 - value : value
  if (effective >= 7) return '#14b8a6'
  if (effective >= 4) return '#f59e0b'
  return '#ef4444'
}

export function CheckinSlider({ label, iconLow, iconHigh, value, onChange, inverted = false }: CheckinSliderProps) {
  const color = sliderColor(value, inverted)
  const pct = ((value - 1) / 9) * 100

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span
          className="text-2xl font-bold transition-colors"
          style={{ color, fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {value}
        </span>
      </div>
      <div className="relative flex items-center gap-3">
        <span className="text-xl w-6 text-center">{iconLow}</span>
        <div className="relative flex-1 h-3 rounded-full" style={{ background: '#e5e7eb' }}>
          {/* Track fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full shadow-md flex items-center justify-center text-xs font-bold text-white transition-all"
            style={{ left: `${pct}%`, background: color }}
          >
            {value}
          </div>
          {/* Invisible native range input on top */}
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ zIndex: 10 }}
          />
        </div>
        <span className="text-xl w-6 text-center">{iconHigh}</span>
      </div>
    </div>
  )
}
