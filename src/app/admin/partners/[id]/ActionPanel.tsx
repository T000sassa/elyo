'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ActionPanel({ partnerId, status }: { partnerId: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function act(action: string, rejectionReason?: string) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason }),
      })
      if (res.ok) {
        router.refresh()
        setShowRejectModal(false)
        return
      }
      const data = await res.json()
      setError(data.error ?? 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {status === 'PENDING_REVIEW' && (
        <>
          <button disabled={loading} onClick={() => act('approve')}
            className="w-full py-2 rounded-lg font-semibold text-white" style={{ background: '#047857' }}>
            Freischalten
          </button>
          <button disabled={loading} onClick={() => setShowRejectModal(true)}
            className="w-full py-2 rounded-lg font-semibold text-white" style={{ background: '#b91c1c' }}>
            Ablehnen
          </button>
        </>
      )}
      {status === 'VERIFIED' && (
        <button disabled={loading} onClick={() => act('suspend')}
          className="w-full py-2 rounded-lg font-semibold text-white" style={{ background: '#b45309' }}>
          Pausieren
        </button>
      )}
      {status === 'SUSPENDED' && (
        <button disabled={loading} onClick={() => act('unsuspend')}
          className="w-full py-2 rounded-lg font-semibold text-white" style={{ background: '#047857' }}>
          Wieder aktivieren
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">Ablehnen</h2>
            <textarea required rows={4} placeholder="Begründung (min 5 Zeichen)" value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 rounded-lg text-sm border border-gray-200">Abbrechen</button>
              <button disabled={loading || reason.length < 5}
                onClick={() => act('reject', reason)}
                className="flex-1 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
                style={{ background: '#b91c1c' }}>
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
