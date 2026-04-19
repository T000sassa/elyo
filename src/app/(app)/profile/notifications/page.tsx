'use client'

import { useState, useEffect } from 'react'

interface Preferences {
  checkinReminder: boolean
  checkinReminderTime: string
  weeklySummary: boolean
  partnerUpdates: boolean
}

const DEFAULT: Preferences = {
  checkinReminder: true,
  checkinReminderTime: '09:00',
  weeklySummary: true,
  partnerUpdates: false,
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(r => r.json())
      .then(data => {
        if (data.preferences) setPrefs(data.preferences)
      })
      .finally(() => setIsLoading(false))

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setPushEnabled(sub !== null)
        })
      })
    }
  }, [])

  async function togglePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const reg = await navigator.serviceWorker.ready
    if (pushEnabled) {
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setPushEnabled(false)
    } else {
      const keyRes = await fetch('/api/push/vapid-public-key')
      const { publicKey } = await keyRes.json()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setPushEnabled(true)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1
        className="text-2xl font-semibold text-gray-900 mb-1"
        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
      >
        Benachrichtigungen
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Steuere, wann und wie du von ELYO benachrichtigt wirst.
      </p>

      {/* Push toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 text-sm">Push-Benachrichtigungen</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {pushEnabled ? 'Aktiv auf diesem Gerät' : 'Inaktiv – tippe zum Aktivieren'}
            </p>
          </div>
          <button
            onClick={togglePush}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              pushEnabled ? 'bg-[#1B4D3E]' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                pushEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notification types */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 mb-6">
        <ToggleRow
          label="Check-in-Erinnerung"
          description="Tägliche Erinnerung zum Check-in"
          checked={prefs.checkinReminder}
          onChange={v => setPrefs(p => ({ ...p, checkinReminder: v }))}
          extra={
            prefs.checkinReminder && (
              <input
                type="time"
                value={prefs.checkinReminderTime}
                onChange={e => setPrefs(p => ({ ...p, checkinReminderTime: e.target.value }))}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]"
              />
            )
          }
        />
        <ToggleRow
          label="Wöchentliche Zusammenfassung"
          description="Deine Wellbeing-Highlights der Woche"
          checked={prefs.weeklySummary}
          onChange={v => setPrefs(p => ({ ...p, weeklySummary: v }))}
        />
        <ToggleRow
          label="Partner-Neuigkeiten"
          description="Neue Angebote und Aktionen"
          checked={prefs.partnerUpdates}
          onChange={v => setPrefs(p => ({ ...p, partnerUpdates: v }))}
        />
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Level-Up-Benachrichtigung</p>
            <p className="text-xs text-gray-500">Wenn du ein neues Level erreichst</p>
          </div>
          <span className="text-xs bg-[#1B4D3E] text-white rounded-full px-2 py-0.5 font-medium">
            Immer aktiv
          </span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition-opacity"
        style={{ backgroundColor: '#1B4D3E' }}
      >
        {saved ? '✓ Gespeichert' : isSaving ? 'Speichern…' : 'Einstellungen speichern'}
      </button>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  extra,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
        {extra && <div className="mt-1">{extra}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-[#1B4D3E]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
