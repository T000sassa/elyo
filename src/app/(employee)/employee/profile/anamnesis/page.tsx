'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, ChevronRight, Loader2, ChevronLeft } from 'lucide-react'
import { ProgressBar } from '@/components/ui/progress-bar'

// ── Types ──────────────────────────────────────────────────────────────────

interface ProfileState {
  birthYear: string
  biologicalSex: string
  activityLevel: string
  sleepQuality: string
  stressTendency: string
  smokingStatus: string
  nutritionType: string
  chronicPatterns: string
  hasMedication: string
}

const EMPTY: ProfileState = {
  birthYear: '', biologicalSex: '', activityLevel: '',
  sleepQuality: '', stressTendency: '', smokingStatus: '',
  nutritionType: '', chronicPatterns: '', hasMedication: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildPayload(state: ProfileState) {
  const p: Record<string, unknown> = {}
  if (state.birthYear)      p.birthYear      = parseInt(state.birthYear)
  if (state.biologicalSex)  p.biologicalSex  = state.biologicalSex
  if (state.activityLevel)  p.activityLevel  = state.activityLevel
  if (state.sleepQuality)   p.sleepQuality   = state.sleepQuality
  if (state.stressTendency) p.stressTendency = state.stressTendency
  if (state.smokingStatus)  p.smokingStatus  = state.smokingStatus
  if (state.nutritionType)  p.nutritionType  = state.nutritionType
  if (state.chronicPatterns) {
    p.chronicPatterns = state.chronicPatterns.split(',').map((s: string) => s.trim()).filter(Boolean)
  }
  if (state.hasMedication !== '') p.hasMedication = state.hasMedication === 'true'
  return p
}

// ── Field helpers ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-gray-700 mb-2">{children}</p>
}

function Radio({
  name, value, label, current, onChange,
}: { name: string; value: string; label: string; current: string; onChange: (v: string) => void }) {
  const active = current === value
  return (
    <label
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
      style={{
        border: `1px solid ${active ? '#14b8a6' : 'hsl(200, 15%, 88%)'}`,
        background: active ? '#f0fdf9' : 'white',
      }}
    >
      <input type="radio" name={name} value={value} checked={active}
        onChange={() => onChange(value)} className="sr-only" />
      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ border: `2px solid ${active ? '#14b8a6' : '#d1d5db'}` }}>
        {active && <div className="w-2 h-2 rounded-full" style={{ background: '#14b8a6' }} />}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm border bg-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
const inputStyle = { borderColor: 'hsl(200, 15%, 88%)' }

// ── Main component ─────────────────────────────────────────────────────────

export default function AnamnesisPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<ProfileState>(EMPTY)
  const [completionPct, setCompletionPct] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadError, setLoadError] = useState(false)

  function set(key: keyof ProfileState, value: string) {
    setState(s => ({ ...s, [key]: value }))
    setSaved(false)
  }

  useEffect(() => {
    fetch('/api/anamnesis')
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return
        setCompletionPct(data.completionPct ?? 0)
        setState({
          birthYear:       data.birthYear?.toString() ?? '',
          biologicalSex:   data.biologicalSex ?? '',
          activityLevel:   data.activityLevel ?? '',
          sleepQuality:    data.sleepQuality ?? '',
          stressTendency:  data.stressTendency ?? '',
          smokingStatus:   data.smokingStatus ?? '',
          nutritionType:   data.nutritionType ?? '',
          chronicPatterns: (data.chronicPatterns ?? []).join(', '),
          hasMedication:   data.hasMedication === null ? '' : String(data.hasMedication),
        })
      })
      .catch(() => setLoadError(true))
  }, [])

  async function save(andGoTo?: number) {
    setSaving(true)
    try {
      const res = await fetch('/api/anamnesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(state)),
      })
      if (res.ok) {
        const { data } = await res.json()
        setCompletionPct(data.completionPct)
        setSaved(true)
        if (andGoTo) setStep(andGoTo)
      }
    } finally {
      setSaving(false)
    }
  }

  const cardStyle = {
    background: 'white',
    border: '1px solid hsl(200, 15%, 88%)',
    borderRadius: 20,
  }

  return (
    <motion.div
      className="space-y-5 pb-24 lg:pb-8 max-w-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Mein Gesundheitsprofil
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Deine Daten sind ausschließlich für dich sichtbar. Kein Arbeitgeber hat Zugriff.
        </p>
      </div>

      <ProgressBar value={completionPct} label="Profil-Vollständigkeit" />

      <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <span className="font-semibold" style={{ color: '#b45309' }}>+20 Punkte</span>
        <span className="text-gray-600"> bei 100% Vollständigkeit</span>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
        {[
          { num: 1, label: 'Basis' },
          { num: 2, label: 'Lebensstil' },
          { num: 3, label: 'Weiteres' },
        ].map(({ num, label }) => (
          <button
            key={num}
            onClick={() => setStep(num)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={step === num
              ? { background: 'white', color: '#14b8a6', boxShadow: '0 1px 3px rgb(0,0,0,0.07)' }
              : { color: '#6b7280' }}
          >
            {label}
          </button>
        ))}
      </div>

      {loadError && (
        <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
          Profil konnte nicht geladen werden. Bitte Seite neu laden.
        </p>
      )}

      {step === 1 && (
        <div style={cardStyle} className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Basis-Informationen</h2>
            <p className="text-xs text-gray-400 mt-0.5">Diese Angaben helfen dabei, deinen Vitalitäts-Index besser einzuordnen.</p>
          </div>

          <div>
            <Label>Geburtsjahr</Label>
            <input
              className={inputCls} style={inputStyle}
              type="number" min="1920" max={new Date().getFullYear() - 16}
              placeholder="z.B. 1988"
              value={state.birthYear}
              onChange={e => set('birthYear', e.target.value)}
            />
          </div>

          <div>
            <Label>Biologisches Geschlecht</Label>
            <div className="space-y-2">
              {[
                { value: 'male', label: 'Männlich' },
                { value: 'female', label: 'Weiblich' },
                { value: 'diverse', label: 'Divers' },
                { value: 'prefer_not', label: 'Keine Angabe' },
              ].map(opt => (
                <Radio key={opt.value} name="biologicalSex" value={opt.value} label={opt.label}
                  current={state.biologicalSex} onChange={v => set('biologicalSex', v)} />
              ))}
            </div>
          </div>

          <div>
            <Label>Aktivitätslevel</Label>
            <div className="space-y-2">
              {[
                { value: 'sedentary', label: 'Sehr wenig Bewegung (sitzende Tätigkeit)' },
                { value: 'light', label: 'Leichte Aktivität (1-2x/Woche Sport)' },
                { value: 'moderate', label: 'Moderate Aktivität (3-4x/Woche Sport)' },
                { value: 'active', label: 'Aktiv (5+x/Woche Sport)' },
                { value: 'very_active', label: 'Sehr aktiv (tägliche intensive Aktivität)' },
              ].map(opt => (
                <Radio key={opt.value} name="activityLevel" value={opt.value} label={opt.label}
                  current={state.activityLevel} onChange={v => set('activityLevel', v)} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => save(2)}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Speichern & Weiter <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={cardStyle} className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Lebensstil & Erholung</h2>
            <p className="text-xs text-gray-400 mt-0.5">Wellen-2-Daten — verfeinern deinen persönlichen Vitalitäts-Index.</p>
          </div>

          <div>
            <Label>Schlafqualität (durchschnittlich)</Label>
            <div className="space-y-2">
              {[
                { value: 'poor', label: 'Schlecht – ich schlafe selten gut durch' },
                { value: 'fair', label: 'Mäßig – manchmal gut, manchmal schlecht' },
                { value: 'good', label: 'Gut – ich schlafe meistens gut' },
                { value: 'excellent', label: 'Sehr gut – erholt und ausgeruht' },
              ].map(opt => (
                <Radio key={opt.value} name="sleepQuality" value={opt.value} label={opt.label}
                  current={state.sleepQuality} onChange={v => set('sleepQuality', v)} />
              ))}
            </div>
          </div>

          <div>
            <Label>Stressneigung</Label>
            <div className="space-y-2">
              {[
                { value: 'low', label: 'Niedrig – ich bleibe meist gelassen' },
                { value: 'medium', label: 'Mittel – gelegentlicher Stress' },
                { value: 'high', label: 'Hoch – regelmäßig starker Stress' },
              ].map(opt => (
                <Radio key={opt.value} name="stressTendency" value={opt.value} label={opt.label}
                  current={state.stressTendency} onChange={v => set('stressTendency', v)} />
              ))}
            </div>
          </div>

          <div>
            <Label>Raucherstatus</Label>
            <div className="space-y-2">
              {[
                { value: 'never', label: 'Nie geraucht' },
                { value: 'former', label: 'Ehemaliger Raucher' },
                { value: 'current', label: 'Aktueller Raucher' },
              ].map(opt => (
                <Radio key={opt.value} name="smokingStatus" value={opt.value} label={opt.label}
                  current={state.smokingStatus} onChange={v => set('smokingStatus', v)} />
              ))}
            </div>
          </div>

          <div>
            <Label>Ernährungsweise</Label>
            <div className="space-y-2">
              {[
                { value: 'omnivore', label: 'Omnivor (alles)' },
                { value: 'vegetarian', label: 'Vegetarisch' },
                { value: 'vegan', label: 'Vegan' },
                { value: 'other', label: 'Sonstiges' },
              ].map(opt => (
                <Radio key={opt.value} name="nutritionType" value={opt.value} label={opt.label}
                  current={state.nutritionType} onChange={v => set('nutritionType', v)} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-gray-600 border"
              style={{ borderColor: 'hsl(200, 15%, 88%)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => save(3)}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Speichern & Weiter <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={cardStyle} className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Weitere Angaben (optional)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Alle Angaben sind freiwillig. ELYO speichert keine medizinischen Details.
            </p>
          </div>

          <div className="rounded-xl p-3" style={{ background: '#f0fdf9', border: '1px solid #d1fae5' }}>
            <p className="text-xs text-gray-600 leading-relaxed">
              🔒 <strong>Deine Daten gehören dir.</strong> Kein Arbeitgeber sieht diese Informationen.
              Du kannst Angaben jederzeit löschen oder ändern.
            </p>
          </div>

          <div>
            <Label>Aktuelle Belastungs-Muster (optional)</Label>
            <input
              className={inputCls} style={inputStyle}
              placeholder="z.B. Rückenschmerzen, Migräne, Erschöpfung"
              value={state.chronicPatterns}
              onChange={e => set('chronicPatterns', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Kommagetrennt, keine medizinischen Diagnosen</p>
          </div>

          <div>
            <Label>Nimmst du regelmäßig Medikamente ein?</Label>
            <div className="space-y-2">
              {[
                { value: 'true', label: 'Ja' },
                { value: 'false', label: 'Nein' },
              ].map(opt => (
                <Radio key={opt.value} name="hasMedication" value={opt.value} label={opt.label}
                  current={state.hasMedication} onChange={v => set('hasMedication', v)} />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Nur Ja/Nein — keine Details</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-gray-600 border"
              style={{ borderColor: 'hsl(200, 15%, 88%)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => save()}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : saved
                  ? <><Check className="w-4 h-4" /> Gespeichert</>
                  : 'Speichern'}
            </button>
          </div>

          {saved && completionPct >= 100 && (
            <div className="text-center py-2">
              <p className="text-sm font-semibold" style={{ color: '#14b8a6' }}>
                🎉 Profil vollständig! +20 Punkte werden gutgeschrieben.
              </p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => router.push('/employee/settings')}
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        ← Zurück zum Profil
      </button>
    </motion.div>
  )
}
