'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const VISIT_KEY = 'elyo_visit_count'
const INSTALLED_KEY = 'elyo_pwa_installed'
const DISMISSED_KEY = 'elyo_banner_dismissed'
const MIN_VISITS = 3

export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(INSTALLED_KEY) || localStorage.getItem(DISMISSED_KEY)) return

    const count = parseInt(localStorage.getItem(VISIT_KEY) ?? '0') + 1
    localStorage.setItem(VISIT_KEY, String(count))

    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
      if (count >= MIN_VISITS) setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      localStorage.setItem(INSTALLED_KEY, '1')
      setShowBanner(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!showBanner || !promptEvent) return null

  async function handleInstall() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, '1')
    }
    setShowBanner(false)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShowBanner(false)
  }

  return (
    <div
      className="fixed bottom-16 lg:bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-3 text-white z-50"
      style={{ backgroundColor: '#1B4D3E' }}
    >
      <span className="text-lg">📱</span>
      <span className="flex-1 text-sm font-medium">ELYO zum Homescreen hinzufügen</span>
      <button
        onClick={handleInstall}
        className="text-xs font-semibold bg-white text-[#1B4D3E] px-3 py-1.5 rounded-full"
      >
        Installieren
      </button>
      <button
        onClick={handleDismiss}
        className="text-white text-lg leading-none p-1"
        aria-label="Schließen"
      >
        ×
      </button>
    </div>
  )
}
