'use client'

interface Props {
  isGoogleConnected: boolean
  isOuraConnected: boolean
  isGarminConnected: boolean
}

interface Source {
  id: 'google' | 'apple' | 'oura' | 'garmin'
  name: string
  icon: string
  iconBg: string
  available: boolean
}

const TERRA_ENABLED = process.env.NEXT_PUBLIC_TERRA_ENABLED === '1'

const SOURCES: Source[] = [
  { id: 'google', name: 'Google Fit', icon: 'G', iconBg: '#4285F4', available: true },
  { id: 'apple',  name: 'Apple Health', icon: '🍎', iconBg: '#e5e7eb', available: false },
  { id: 'oura',   name: 'Oura Ring', icon: '💍', iconBg: '#e5e7eb', available: TERRA_ENABLED },
  { id: 'garmin', name: 'Garmin', icon: '⌚', iconBg: '#e5e7eb', available: TERRA_ENABLED },
]

export function AvailableTab({ isGoogleConnected, isOuraConnected, isGarminConnected }: Props) {
  function isConnected(id: Source['id']): boolean {
    if (id === 'google') return isGoogleConnected
    if (id === 'oura') return isOuraConnected
    if (id === 'garmin') return isGarminConnected
    return false
  }

  function connectHref(id: Source['id']): string {
    if (id === 'google') return '/api/wearables/google/connect'
    if (id === 'oura') return '/api/wearables/terra/connect?provider=OURA'
    if (id === 'garmin') return '/api/wearables/terra/connect?provider=GARMIN'
    return '#'
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {SOURCES.map(source => {
        const connectable = source.available
        const connected = isConnected(source.id)
        return (
          <div
            key={source.id}
            className="rounded-xl border border-gray-200 p-4 text-center space-y-2"
            style={connectable ? {} : { opacity: 0.5, pointerEvents: 'none' as const }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto text-sm font-bold"
              style={{ background: source.iconBg, color: source.id === 'google' ? 'white' : undefined }}
            >
              {source.icon}
            </div>
            <div className="text-sm font-medium text-gray-800">{source.name}</div>
            {connectable ? (
              connected ? (
                <span className="inline-block text-xs font-medium text-emerald-600">✓ Verbunden</span>
              ) : (
                <a
                  href={connectHref(source.id)}
                  className="inline-block text-xs font-semibold text-white px-3 py-1 rounded-full transition-opacity hover:opacity-90"
                  style={{ background: '#1B4D3E' }}
                >
                  Verbinden
                </a>
              )
            ) : (
              <span className="inline-block text-xs text-gray-400">Bald</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
