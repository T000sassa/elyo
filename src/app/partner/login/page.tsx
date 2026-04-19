'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PartnerLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/partner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        router.push('/partner/dashboard')
        return
      }
      const data = await res.json()
      setError(data.error === 'rate_limited' ? 'Zu viele Versuche.' : 'E-Mail oder Passwort falsch.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        Partner-Login
      </h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input required type="email" placeholder="E-Mail" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input required type="password" placeholder="Passwort" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} type="submit"
          className="w-full py-3 rounded-lg font-semibold text-white disabled:opacity-50"
          style={{ background: '#14b8a6' }}>
          {loading ? 'Login …' : 'Einloggen'}
        </button>
      </form>
      <p className="text-xs text-gray-500 text-center mt-4">
        Noch kein Partner? <a href="/partner/register" className="text-emerald-700 font-medium">Registrieren</a>
      </p>
    </div>
  )
}
