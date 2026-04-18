'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { WearableConnection } from '@prisma/client'

interface Props {
  connection: WearableConnection | null
}

export function ConnectedTab({ connection }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [toast, setToast] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      setToast('Verbindung fehlgeschlagen. Bitte erneut versuchen.')
    }
  }, [searchParams])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/wearables/google/sync', { method: 'POST' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setToast('Sync fehlgeschlagen, bitte erneut versuchen.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/wearables/google/disconnect', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setToast('Trennen fehlgeschlagen.')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex justify-between items-center">
          {toast}
          <button onClick={() => setToast(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {connection?.isActive ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: '#4285F4' }}
          >
            G
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900">Google Fit</div>
            <div className="text-xs text-gray-500">
              Verbunden seit {new Date(connection.connectedAt).toLocaleDateString('de-DE')}
            </div>
          </div>
          <div className="text-xs text-emerald-600 font-medium flex-shrink-0">✓ Aktiv</div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center space-y-3">
          <p className="text-sm text-gray-500">Noch keine Quelle verbunden.</p>
          <a
            href="/api/wearables/google/connect"
            className="inline-block rounded-full px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#1B4D3E' }}
          >
            Google Fit verbinden
          </a>
        </div>
      )}

      {connection?.isActive && (
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 rounded-full border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : '🔄 Jetzt synchronisieren'}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {disconnecting ? '…' : 'Trennen'}
          </button>
        </div>
      )}
    </div>
  )
}
