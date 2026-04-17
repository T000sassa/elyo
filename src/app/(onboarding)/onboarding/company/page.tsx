'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Check, Loader2, ChevronRight, Users } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface FormData {
  companyName: string
  industry: string
  employeeRange: string
  country: string
  adminName: string
  email: string
  password: string
  anonymityThreshold: number
  checkinFrequency: 'DAILY' | 'WEEKLY'
  dsgvoAccepted: boolean
  agbAccepted: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'Produktion / Fertigung', 'IT / Software', 'Handel / Retail',
  'Gesundheitswesen', 'Finanzdienstleistungen', 'Logistik / Transport',
  'Bau / Handwerk', 'Dienstleistungen', 'Bildung / Non-Profit', 'Sonstiges',
]

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '500+']

const ANONYMITY_OPTIONS = [
  { value: 3,  label: '3 Einträge',  desc: 'Niedriger Schwellwert – mehr Einblick, weniger Datenschutz' },
  { value: 5,  label: '5 Einträge',  desc: 'Empfohlen – ausgewogener Standard' },
  { value: 10, label: '10 Einträge', desc: 'Hoher Schwellwert – maximaler Datenschutz' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Schwach', color: '#ef4444' }
  if (score <= 3) return { score, label: 'Mittel', color: '#f59e0b' }
  return { score, label: 'Stark', color: '#14b8a6' }
}

// ── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
            style={
              s < current
                ? { background: '#14b8a6', color: 'white' }
                : s === current
                  ? { background: '#0a1f1c', color: 'white' }
                  : { background: '#e5e7eb', color: '#9ca3af' }
            }
          >
            {s < current ? <Check className="w-3.5 h-3.5" /> : s}
          </div>
          {s < total && (
            <div className="h-0.5 w-8" style={{ background: s < current ? '#14b8a6' : '#e5e7eb' }} />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-gray-400">Schritt {current} von {total}</span>
    </div>
  )
}

// ── Field components ───────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm border bg-white outline-none transition-all focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
const inputStyle = { borderColor: 'hsl(200, 15%, 88%)' }

// ── Main component ─────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [inviteText, setInviteText] = useState('')
  const [inviteResult, setInviteResult] = useState<{ sent: number; failed: string[] } | null>(null)

  const [data, setData] = useState<FormData>({
    companyName: '', industry: '', employeeRange: '', country: 'DE',
    adminName: '', email: '', password: '',
    anonymityThreshold: 5, checkinFrequency: 'WEEKLY',
    dsgvoAccepted: false, agbAccepted: false,
  })

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData(d => ({ ...d, [key]: value }))
    setError(null)
  }

  // ── Step navigation ──────────────────────────────────────────────────────

  function nextStep1() {
    if (data.companyName.trim().length < 2) { setError('Firmenname muss mindestens 2 Zeichen haben'); return }
    setStep(2)
  }

  function nextStep2() {
    if (data.adminName.trim().length < 2) { setError('Name muss mindestens 2 Zeichen haben'); return }
    if (!data.email.includes('@')) { setError('Ungültige E-Mail-Adresse'); return }
    if (data.password.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben'); return }
    setStep(3)
  }

  async function submitStep3() {
    if (!data.dsgvoAccepted) { setError('Bitte bestätige die Datenschutzerklärung'); return }
    if (!data.agbAccepted) { setError('Bitte akzeptiere die AGB'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.companyName,
          industry: data.industry || undefined,
          employeeRange: data.employeeRange || undefined,
          country: data.country,
          adminName: data.adminName,
          email: data.email,
          password: data.password,
          anonymityThreshold: data.anonymityThreshold,
          checkinFrequency: data.checkinFrequency,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(typeof body.error === 'string' ? body.error : 'Ein Fehler ist aufgetreten')
        return
      }

      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })
      if (signInResult?.error) {
        setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.')
        return
      }
      setStep(4)
    } finally {
      setLoading(false)
    }
  }

  async function submitStep4(skip = false) {
    if (skip) { router.push('/company/dashboard'); return }

    const emails = inviteText
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

    if (emails.length === 0) { router.push('/company/dashboard'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Fehler beim Senden der Einladungen')
        return
      }
      setInviteResult(body)
      setTimeout(() => router.push('/company/dashboard'), 2500)
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = { background: 'white', border: '1px solid hsl(200, 15%, 88%)', borderRadius: 20 }

  // ── Step 1: Company info ───────────────────────────────────────────────

  if (step === 1) return (
    <div className="space-y-5">
      <StepIndicator current={1} total={4} />
      <div style={cardStyle} className="p-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Unternehmen anlegen
          </h1>
          <p className="text-sm text-gray-400 mt-1">Basis-Informationen zu deinem Unternehmen</p>
        </div>

        <Field label="Unternehmensname *">
          <input
            className={inputCls} style={inputStyle}
            placeholder="Müller Maschinenbau GmbH"
            value={data.companyName}
            onChange={e => set('companyName', e.target.value)}
            autoFocus
          />
        </Field>

        <Field label="Branche">
          <select
            className={inputCls} style={inputStyle}
            value={data.industry}
            onChange={e => set('industry', e.target.value)}
          >
            <option value="">Bitte wählen</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Mitarbeiteranzahl">
            <select
              className={inputCls} style={inputStyle}
              value={data.employeeRange}
              onChange={e => set('employeeRange', e.target.value)}
            >
              <option value="">Bitte wählen</option>
              {EMPLOYEE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>

          <Field label="Land">
            <select
              className={inputCls} style={inputStyle}
              value={data.country}
              onChange={e => set('country', e.target.value)}
            >
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
              <option value="CH">Schweiz</option>
            </select>
          </Field>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <button
          onClick={nextStep1}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          Weiter <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  // ── Step 2: Admin account ──────────────────────────────────────────────

  if (step === 2) {
    const strength = passwordStrength(data.password)
    return (
      <div className="space-y-5">
        <StepIndicator current={2} total={4} />
        <div style={cardStyle} className="p-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Admin-Account anlegen
            </h1>
            <p className="text-sm text-gray-400 mt-1">Du verwaltest das Unternehmen mit diesem Account</p>
          </div>

          <Field label="Vollständiger Name *">
            <input
              className={inputCls} style={inputStyle}
              placeholder="Max Müller"
              value={data.adminName}
              onChange={e => set('adminName', e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="E-Mail-Adresse *">
            <input
              className={inputCls} style={inputStyle}
              type="email"
              placeholder="admin@unternehmen.de"
              value={data.email}
              onChange={e => set('email', e.target.value)}
            />
          </Field>

          <Field label="Passwort *">
            <div className="relative">
              <input
                className={inputCls} style={inputStyle}
                type={showPassword ? 'text' : 'password'}
                placeholder="Mindestens 8 Zeichen"
                value={data.password}
                onChange={e => set('password', e.target.value)}
              />
              <button
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                type="button"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {data.password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full"
                      style={{ background: i < strength.score ? strength.color : '#e5e7eb' }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}
          </Field>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-gray-600 border"
              style={{ borderColor: 'hsl(200, 15%, 88%)' }}
            >
              Zurück
            </button>
            <button
              onClick={nextStep2}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Weiter <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: Privacy & terms ────────────────────────────────────────────

  if (step === 3) return (
    <div className="space-y-5">
      <StepIndicator current={3} total={4} />
      <div style={cardStyle} className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Datenschutz & Betriebsvereinbarung
          </h1>
          <p className="text-sm text-gray-400 mt-1">Einstellungen für Anonymitätsschutz und Check-in-Häufigkeit</p>
        </div>

        {/* Anonymity threshold */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Anonymitätsschwelle</p>
          <div className="space-y-2">
            {ANONYMITY_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `1px solid ${data.anonymityThreshold === opt.value ? '#14b8a6' : 'hsl(200, 15%, 88%)'}`,
                  background: data.anonymityThreshold === opt.value ? '#f0fdf9' : 'white',
                }}
              >
                <input
                  type="radio"
                  name="anonymityThreshold"
                  value={opt.value}
                  checked={data.anonymityThreshold === opt.value}
                  onChange={() => set('anonymityThreshold', opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Check-in frequency */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Check-in-Häufigkeit</p>
          <div className="grid grid-cols-2 gap-3">
            {(['DAILY', 'WEEKLY'] as const).map(freq => (
              <label
                key={freq}
                className="flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer text-sm font-medium transition-all"
                style={{
                  border: `1px solid ${data.checkinFrequency === freq ? '#14b8a6' : 'hsl(200, 15%, 88%)'}`,
                  background: data.checkinFrequency === freq ? '#f0fdf9' : 'white',
                  color: data.checkinFrequency === freq ? '#0d9488' : '#6b7280',
                }}
              >
                <input
                  type="radio" name="checkinFrequency" value={freq}
                  checked={data.checkinFrequency === freq}
                  onChange={() => set('checkinFrequency', freq)}
                  className="sr-only"
                />
                {freq === 'DAILY' ? 'Täglich' : 'Wöchentlich'}
              </label>
            ))}
          </div>
        </div>

        {/* Legal checkboxes */}
        <div className="space-y-3">
          {[
            { key: 'dsgvoAccepted' as const, label: 'Ich bestätige, dass die Nutzung von ELYO mit unserem Betriebsrat / der DSGVO abgestimmt wurde.' },
            { key: 'agbAccepted' as const, label: 'Ich akzeptiere die Allgemeinen Geschäftsbedingungen und Datenschutzrichtlinien von ELYO.' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={{ background: data[key] ? '#14b8a6' : 'white', border: `1.5px solid ${data[key] ? '#14b8a6' : '#d1d5db'}` }}
                onClick={() => set(key, !data[key])}
              >
                {data[key] && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-xs text-gray-600 leading-relaxed">{label}</span>
            </label>
          ))}
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => setStep(2)}
            className="px-4 py-3 rounded-xl text-sm font-medium text-gray-600 border"
            style={{ borderColor: 'hsl(200, 15%, 88%)' }}
          >
            Zurück
          </button>
          <button
            onClick={submitStep3}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Konto erstellen <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Step 4: Invite employees ───────────────────────────────────────────

  return (
    <div className="space-y-5">
      <StepIndicator current={4} total={4} />
      <div style={cardStyle} className="p-6 space-y-5">
        {inviteResult ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#f0fdf9' }}>
              <Check className="w-7 h-7" style={{ color: '#14b8a6' }} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {inviteResult.sent} Einladungen gesendet!
            </h2>
            {inviteResult.failed.length > 0 && (
              <p className="text-sm text-gray-400 mt-1">{inviteResult.failed.length} E-Mails konnten nicht gesendet werden.</p>
            )}
            <p className="text-xs text-gray-400 mt-3">Weiterleitung zum Dashboard…</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Team einladen
              </h1>
              <p className="text-sm text-gray-400 mt-1">Du kannst Einladungen jederzeit auch später verschicken.</p>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f0fdf9', border: '1px solid #d1fae5' }}>
              <Users className="w-4 h-4 flex-shrink-0" style={{ color: '#0d9488' }} />
              <p className="text-xs text-gray-600">
                Mitarbeiter erhalten einen persönlichen Einladungslink per E-Mail (gültig 14 Tage).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-Mail-Adressen (eine pro Zeile oder kommagetrennt)
              </label>
              <textarea
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border bg-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                style={{ borderColor: 'hsl(200, 15%, 88%)', minHeight: 120 }}
                placeholder={"max.mustermann@firma.de\nerika.muster@firma.de\nteam@firma.de"}
                value={inviteText}
                onChange={e => { setInviteText(e.target.value); setError(null) }}
              />
              <p className="text-xs text-gray-400 mt-1">
                {inviteText.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length} E-Mail(s) erkannt
              </p>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => submitStep4(true)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-gray-500"
              >
                Überspringen →
              </button>
              <button
                onClick={() => submitStep4(false)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : 'Einladungen senden'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
