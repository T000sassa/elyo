'use client'

import { useEffect, useState } from 'react'
import { type Level } from '@/components/ui/level-badge'

const LEVEL_COLORS: Record<Level, { primary: string; secondary: string; glow: string }> = {
  STARTER:  { primary: '#9ca3af', secondary: '#d1d5db', glow: 'rgba(156,163,175,0.3)' },
  BRONZE:   { primary: '#b45309', secondary: '#f59e0b', glow: 'rgba(180,83,9,0.3)'   },
  SILVER:   { primary: '#64748b', secondary: '#cbd5e1', glow: 'rgba(100,116,139,0.4)' },
  GOLD:     { primary: '#b45309', secondary: '#fcd34d', glow: 'rgba(251,191,36,0.4)'  },
  PLATINUM: { primary: '#7c3aed', secondary: '#ddd6fe', glow: 'rgba(124,58,237,0.4)'  },
}

interface LevelEmblemProps {
  level: Level
  progress: number  // 0–100
  size?: number
}

export function LevelEmblem({ level, progress, size = 160 }: LevelEmblemProps) {
  const [displayed, setDisplayed] = useState(0)
  const colors = LEVEL_COLORS[level]
  const r = (size - 16) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const arcFill = (displayed / 100) * circumference

  useEffect(() => {
    const t = setTimeout(() => setDisplayed(progress), 100)
    return () => clearTimeout(t)
  }, [progress])

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          animation: 'float 3s ease-in-out infinite',
        }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        {/* Progress ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={colors.secondary}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${arcFill} ${circumference}`}
          strokeDashoffset={circumference * 0.25}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
          }}
        />
        {/* Inner hexagon */}
        <polygon
          points={hexagonPoints(cx, cy, r * 0.6)}
          fill={colors.primary}
          opacity="0.15"
        />
        <polygon
          points={hexagonPoints(cx, cy, r * 0.6)}
          fill="none"
          stroke={colors.primary}
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Level initial */}
        <text
          x={cx} y={cy + 6}
          textAnchor="middle"
          style={{
            fill: colors.primary,
            fontSize: size * 0.2,
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 600,
          }}
        >
          {level[0]}
        </text>
      </svg>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}

function hexagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
}
