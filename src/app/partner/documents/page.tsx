'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PartnerDocumentsPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData(e.currentTarget)
      const res = await fetch('/api/partner/documents', { method: 'POST', body: formData })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => router.push('/partner/dashboard'), 1500)
        return
      }
      const data = await res.json()
      setError(
        data.error === 'too_large' ? 'Datei ist zu groß (max 5 MB).' :
        data.error === 'invalid_file' ? 'Nur PDF, PNG oder JPG erlaubt.' :
        data.error === 'unauthorized' ? 'Session abgelaufen, bitte neu einloggen.' :
        'Upload fehlgeschlagen.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        Nachweis hochladen
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        PDF, PNG oder JPG. Max 5 MB. Beispiele: Register-Auszug, Zertifikat, Gewerbeanmeldung.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input required name="file" type="file" accept="application/pdf,image/png,image/jpeg" className="w-full" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Hochgeladen. Weiterleitung …</p>}
        <button disabled={uploading} type="submit"
          className="w-full py-3 rounded-lg font-semibold text-white disabled:opacity-50"
          style={{ background: '#14b8a6' }}>
          {uploading ? 'Lade hoch …' : 'Hochladen'}
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-4">
        <a href="/partner/dashboard" className="underline">Zurück zum Dashboard</a>
      </p>
    </div>
  )
}
