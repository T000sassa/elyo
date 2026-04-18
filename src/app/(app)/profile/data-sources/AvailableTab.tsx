'use client'

interface Props {
  isGoogleConnected: boolean
}

const SOURCES = [
  { id: 'google', name: 'Google Fit', icon: 'G', iconBg: '#4285F4', available: true },
  { id: 'apple', name: 'Apple Health', icon: '🍎', iconBg: '#e5e7eb', available: false },
  { id: 'oura', name: 'Oura Ring', icon: '💍', iconBg: '#e5e7eb', available: false },
  { id: 'garmin', name: 'Garmin', icon: '⌚', iconBg: '#e5e7eb', available: false },
]

export function AvailableTab({ isGoogleConnected }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SOURCES.map(source => (
        <div
          key={source.id}
          className="rounded-xl border border-gray-200 p-4 text-center space-y-2"
          style={source.available ? {} : { opacity: 0.5 }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mx-auto text-sm font-bold"
            style={{ background: source.iconBg, color: source.id === 'google' ? 'white' : undefined }}
          >
            {source.icon}
          </div>
          <div className="text-sm font-medium text-gray-800">{source.name}</div>
          {source.id === 'google' ? (
            isGoogleConnected ? (
              <span className="inline-block text-xs font-medium text-emerald-600">✓ Verbunden</span>
            ) : (
              <a
                href="/api/wearables/google/connect"
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
      ))}
    </div>
  )
}
