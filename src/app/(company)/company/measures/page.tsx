'use client'

import { useState, useEffect, useCallback } from 'react'

type MeasureCategory = 'workshop' | 'flexibility' | 'sport' | 'mental' | 'nutrition'
type MeasureStatus = 'SUGGESTED' | 'ACTIVE' | 'COMPLETED' | 'DISMISSED'

interface MeasureTeam {
  name: string
}

interface Measure {
  id: string
  teamId: string | null
  title: string
  category: MeasureCategory
  description: string
  status: MeasureStatus
  suggestedAt: string
  startedAt: string | null
  completedAt: string | null
  createdBy: string
  team: MeasureTeam | null
}

const CATEGORY_ICONS: Record<MeasureCategory, string> = {
  workshop: '🎓',
  flexibility: '🕐',
  sport: '💪',
  mental: '🧠',
  nutrition: '🥗',
}

const CATEGORY_LABELS: Record<MeasureCategory, string> = {
  workshop: 'Workshop',
  flexibility: 'Flexibilität',
  sport: 'Bewegung',
  mental: 'Mental',
  nutrition: 'Ernährung',
}

export default function MeasuresPage() {
  const [measures, setMeasures] = useState<Measure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'suggested' | 'active' | 'archive'>('suggested')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', category: 'sport' as MeasureCategory, description: '', teamId: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchMeasures = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/measures')
      if (res.ok) {
        const data = await res.json()
        setMeasures(data.measures)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMeasures()
  }, [fetchMeasures])

  async function handleStatusChange(id: string, status: MeasureStatus) {
    await fetch(`/api/measures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchMeasures()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const body: Record<string, string> = {
        title: formData.title,
        category: formData.category,
        description: formData.description,
      }
      if (formData.teamId) body.teamId = formData.teamId
      const res = await fetch('/api/measures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setShowCreateForm(false)
        setFormData({ title: '', category: 'sport', description: '', teamId: '' })
        setActiveTab('active')
        await fetchMeasures()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const suggested = measures.filter(m => m.status === 'SUGGESTED')
  const active = measures.filter(m => m.status === 'ACTIVE')
  const archive = measures.filter(m => m.status === 'COMPLETED' || m.status === 'DISMISSED')

  const tabs = [
    { key: 'suggested' as const, label: 'Vorschläge', count: suggested.length },
    { key: 'active' as const, label: 'Aktiv', count: active.length },
    { key: 'archive' as const, label: 'Archiv', count: archive.length },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-semibold text-gray-900 mb-1"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Maßnahmen-Hub
          </h1>
          <p className="text-sm text-gray-500">
            Steuere Interventionen basierend auf anonymisierten Wellbeing-Signalen.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#1B4D3E' }}
        >
          + Eigene Maßnahme
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-4"
        >
          <h2 className="font-medium text-gray-900">Neue Maßnahme erstellen</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Titel *</label>
              <input
                required
                minLength={3}
                maxLength={100}
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                placeholder="z.B. Bewegungspause einführen"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Kategorie *</label>
              <select
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value as MeasureCategory }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Team (optional)</label>
              <input
                value={formData.teamId}
                onChange={e => setFormData(f => ({ ...f, teamId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                placeholder="Team-ID"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Beschreibung *</label>
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={3}
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] resize-none"
                placeholder="Kurze Beschreibung der Maßnahme..."
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: '#1B4D3E' }}
            >
              {isSubmitting ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'text-[#1B4D3E] border-b-2 border-[#1B4D3E] bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'suggested' && (
            <div className="space-y-3">
              {suggested.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Keine offenen Vorschläge.</p>
              ) : (
                suggested.map(m => (
                  <MeasureCard
                    key={m.id}
                    measure={m}
                    actions={[
                      { label: 'Aktivieren', status: 'ACTIVE', primary: true },
                      { label: 'Verwerfen', status: 'DISMISSED', primary: false },
                    ]}
                    onAction={handleStatusChange}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'active' && (
            <div className="space-y-3">
              {active.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Keine aktiven Maßnahmen.</p>
              ) : (
                active.map(m => (
                  <MeasureCard
                    key={m.id}
                    measure={m}
                    actions={[
                      { label: 'Abschließen', status: 'COMPLETED', primary: true },
                      { label: 'Verwerfen', status: 'DISMISSED', primary: false },
                    ]}
                    onAction={handleStatusChange}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'archive' && (
            <div className="overflow-x-auto">
              {archive.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Noch keine archivierten Maßnahmen.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Maßnahme</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Team</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archive.map(m => (
                      <tr key={m.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-900">{m.title}</td>
                        <td className="py-2 px-3 text-gray-500">{m.team?.name ?? 'Gesamtes Unternehmen'}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              m.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {m.status === 'COMPLETED' ? 'Abgeschlossen' : 'Verworfen'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-400">
                          {new Date(m.completedAt ?? m.suggestedAt).toLocaleDateString('de-DE')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface MeasureCardAction {
  label: string
  status: MeasureStatus
  primary: boolean
}

function MeasureCard({
  measure,
  actions,
  onAction,
}: {
  measure: Measure
  actions: MeasureCardAction[]
  onAction: (id: string, status: MeasureStatus) => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
      <div className="text-2xl leading-none mt-0.5">
        {CATEGORY_ICONS[measure.category]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900 text-sm">{measure.title}</span>
          <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
            {CATEGORY_LABELS[measure.category]}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-2">{measure.description}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="bg-gray-100 rounded px-2 py-0.5">
            {measure.team?.name ?? 'Gesamtes Unternehmen'}
          </span>
          <span>
            {new Date(measure.suggestedAt).toLocaleDateString('de-DE')}
          </span>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {actions.map(action => (
          <button
            key={action.status}
            onClick={() => onAction(measure.id, action.status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 ${
              action.primary
                ? 'text-white'
                : 'text-gray-600 border border-gray-300 bg-white'
            }`}
            style={action.primary ? { backgroundColor: '#1B4D3E' } : undefined}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
