import { MapPin, Star, Wifi, Lock } from 'lucide-react'
import { LevelBadge, type Level } from '@/components/ui/level-badge'
import { cn } from '@/lib/utils'

export interface Partner {
  name: string
  type: string
  distance: string | 'digital'
  rating: number
  verified: boolean
  minLevel: Level | 'all'
  currentLevel: Level
  fastLane?: boolean
  goldSlots?: boolean
  pending?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  Physiotherapie: '#14b8a6',
  Bewegung:       '#4c8448',
  Präventivmedizin:'#6d28d9',
  'Mental Health': '#ec4899',
  Ernährung:      '#f59e0b',
  Fitness:        '#ef4444',
  MSK:            '#3b82f6',
  Schlaf:         '#8b5cf6',
}

const LEVEL_ORDER: Level[] = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']

function isUnlocked(current: Level, required: Level | 'all'): boolean {
  if (required === 'all') return true
  return LEVEL_ORDER.indexOf(current) >= LEVEL_ORDER.indexOf(required)
}

export function PartnerCard({ partner, onClick }: { partner: Partner; onClick?: () => void }) {
  const unlocked = isUnlocked(partner.currentLevel, partner.minLevel)
  const color = CATEGORY_COLORS[partner.type] ?? '#14b8a6'

  return (
    <div
      onClick={onClick}
      className={cn('flex items-start gap-4 p-4 rounded-2xl card-lift cursor-pointer', !unlocked && 'opacity-70')}
      style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}
    >
      {/* Category stripe */}
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />

      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
        {partner.distance === 'digital'
          ? <Wifi className="w-5 h-5" style={{ color }} />
          : <MapPin className="w-5 h-5" style={{ color }} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-800 leading-tight">{partner.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {partner.type} ·{' '}
              {partner.distance === 'digital' ? '🌐 Digital' : `📍 ${partner.distance}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {partner.minLevel !== 'all'
              ? <LevelBadge level={partner.minLevel} size="sm" />
              : <span className="text-[10px] text-gray-400 font-medium">Für alle</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-gray-700">{partner.rating}</span>
          </div>
          {partner.verified && !partner.pending && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: '#f0fdf9', color: '#0d9488' }}
            >
              ELYO Verified
            </span>
          )}
          {partner.pending && (
            <span className="text-[10px] font-medium text-gray-400 px-1.5 py-0.5 rounded-full bg-gray-100">
              In Prüfung
            </span>
          )}
          {partner.fastLane && unlocked && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-auto"
              style={{ background: '#fffbeb', color: '#b45309' }}
            >
              ⚡ Heute verfügbar
            </span>
          )}
        </div>

        <div className="mt-3">
          {unlocked ? (
            <button
              className="w-full py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Vorteil nutzen
            </button>
          ) : (
            <button
              className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
              style={{ background: '#f3f4f6', color: '#9ca3af' }}
              disabled
            >
              <Lock className="w-3 h-3" />
              Ab {partner.minLevel} verfügbar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
