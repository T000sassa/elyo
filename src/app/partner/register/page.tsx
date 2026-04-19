'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { id: 'physiotherapy', label: 'Physiotherapie' },
  { id: 'fitness',       label: 'Fitness' },
  { id: 'mental',        label: 'Mental Health' },
  { id: 'nutrition',     label: 'Ernährung' },
  { id: 'sleep',         label: 'Schlaf' },
  { id: 'msk',           label: 'MSK' },
  { id: 'prevention',    label: 'Präventivmedizin' },
  { id: 'movement',      label: 'Bewegung' },
]

export default function PartnerRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: '', password: '', name: '',
    type: 'LOCAL', categories: [] as string[],
    description: '', city: '', address: '', website: '', phone: '',
    minimumLevel: 'STARTER',
  })

  function toggleCategory(id: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id],
    }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.status === 201) {
        router.push('/partner/dashboard')
        return
      }
      const data = await res.json()
      setError(
        data.error === 'email_taken' ? 'Diese E-Mail ist bereits registriert.' :
        data.error === 'rate_limited' ? 'Zu viele Versuche. Bitte später erneut.' :
        'Eingaben prüfen und erneut versuchen.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        Partner werden
      </h1>
      <p className="text-sm text-gray-500 mb-6">Registriere dein Angebot im ELYO-Partner-Netzwerk.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input required type="email" placeholder="E-Mail" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input required type="password" placeholder="Passwort (min 8 Zeichen)" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input required placeholder="Name des Angebots" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
          <div className="flex gap-2">
            {(['LOCAL', 'EXPERT', 'DIGITAL'] as const).map((t) => (
              <button type="button" key={t} onClick={() => setForm({ ...form, type: t })}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={form.type === t ? { background: '#14b8a6', color: 'white' } : { background: '#f3f4f6', color: '#6b7280' }}>
                {t === 'LOCAL' ? 'Lokal' : t === 'EXPERT' ? 'Experte' : 'Digital'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kategorien (mind. 1)</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} onClick={() => toggleCategory(c.id)}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={form.categories.includes(c.id) ? { background: '#14b8a6', color: 'white' } : { background: '#f3f4f6', color: '#6b7280' }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <textarea required placeholder="Beschreibung (min 40 Zeichen)" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" />

        <input placeholder="Stadt (optional)" value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />

        <input placeholder="Adresse (optional)" value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />

        <input type="url" placeholder="Website (optional)" value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />

        <input type="tel" placeholder="Telefon (optional)" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mindest-Level (ab welchem Level dürfen Mitarbeiter dein Angebot nutzen)</label>
          <select value={form.minimumLevel} onChange={(e) => setForm({ ...form, minimumLevel: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-lg font-semibold text-white disabled:opacity-50"
          style={{ background: '#14b8a6' }}>
          {loading ? 'Registriere …' : 'Registrieren'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Schon registriert? <a href="/partner/login" className="text-emerald-700 font-medium">Hier einloggen</a>
        </p>
      </form>
    </div>
  )
}
