'use client'

import { useState } from 'react'
import { useRole, type DemoRole } from '@/contexts/RoleContext'
import { useRouter } from 'next/navigation'

const ROLE_OPTIONS: { value: DemoRole; label: string; icon: string; defaultHref: string }[] = [
  { value: 'employee', label: 'Mitarbeiter',  icon: '👤', defaultHref: '/dashboard'         },
  { value: 'admin',    label: 'HR-Admin',     icon: '🏢', defaultHref: '/company/dashboard' },
  { value: 'partner',  label: 'Partner',      icon: '🤝', defaultHref: '/partner/profile'   },
]

export function RoleSwitcher() {
  const { role, setRole } = useRole()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleSelect(option: typeof ROLE_OPTIONS[0]) {
    setRole(option.value)
    setOpen(false)
    router.push(option.defaultHref)
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50">
      {open && (
        <div
          className="absolute bottom-14 right-0 mb-1 rounded-2xl shadow-card-lg overflow-hidden"
          style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)', minWidth: 180 }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'hsl(200, 15%, 88%)' }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Demo-Modus</p>
          </div>
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt)}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ color: role === opt.value ? '#14b8a6' : '#374151' }}
            >
              <span>{opt.icon}</span>
              {opt.label}
              {role === opt.value && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold shadow-card-md transition-all hover:shadow-card-lg"
        style={{ background: '#0a1f1c', color: '#5eead4' }}
        title="Rolle wechseln (Demo-Modus)"
      >
        🎭
        <span className="hidden sm:inline">Rolle wechseln</span>
      </button>
    </div>
  )
}
