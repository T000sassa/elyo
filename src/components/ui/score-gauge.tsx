'use client'

import { useEffect, useState } from 'react'

interface ScoreGaugeProps {
  score: number      // 0–100
  maxScore?: number  // default 100
  size?: number      // px, default 200
  strokeWidth?: number
  animate?: boolean
}

function gaugeColor(pct: number): string {
  if (pct >= 0.7) return '#14b8a6'
  if (pct >= 0.5) return '#f59e0b'
  return '#ef4444'
}

export function ScoreGauge({
  score,
  maxScore = 100,
  size = 200,
  strokeWidth = 12,
  animate = true,
}: ScoreGaugeProps) {
  const pct = Math.min(Math.max(score / maxScore, 0), 1)
  const [displayPct, setDisplayPct] = useState(animate ? 0 : pct)

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => setDisplayPct(pct), 50)
    return () => clearTimeout(timer)
  }, [pct, animate])

  const r = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  // 270° sweep (¾ of circle), starting from bottom-left (135°)
  const arcLength = circumference * 0.75
  const filled = displayPct * arcLength
  const color = gaugeColor(pct)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference * 0.25 + 1}`}
          strokeDashoffset={-(circumference * 0.125)}
          style={{ transform: 'rotate(135deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          strokeDashoffset={-(circumference * 0.125)}
          style={{
            transform: 'rotate(135deg)',
            transformOrigin: `${cx}px ${cy}px`,
            transition: animate ? 'stroke-dasharray 1s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold leading-none"
          style={{
            fontSize: size * 0.2,
            color,
            fontFamily: "'Fraunces', Georgia, serif",
          }}
        >
          {score}
        </span>
        <span className="text-xs font-medium text-gray-400 mt-1">/ {maxScore}</span>
      </div>
    </div>
  )
}
