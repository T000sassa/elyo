'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './partner-login.module.css'

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
    <div className={styles['login-shell']}>

      {/* ============ LINKS: MARKENPANEL ============ */}
      <section className={styles['brand-panel']}>

        <header className={styles['brand-head']}>
          <div className={styles['logo-mark']}>E</div>
          <div className={styles['brand-name']}>elyo</div>
          <span className={styles['brand-sub']}>Partner-Portal</span>
        </header>

        <div className={styles['brand-hero']}>
          <span className={styles['brand-kicker']}>◇ Für Gesundheitsexperten · 2026</span>
          <h1>Werde Teil eines <em>kuratierten Netzwerks</em> für betriebliche Vitalität.</h1>
          <p>ELYO verbindet geprüfte lokale und digitale Anbieter mit Unternehmen, die Gesundheit strukturell ernst nehmen. Qualität vor Quantität — jede Aufnahme wird persönlich geprüft.</p>
        </div>

        <div className={styles['benefits']}>

          <div className={styles['benefit-row']}>
            <div className={styles['benefit-icon']}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z"/><path d="M9 12l2 2 4-4"/></svg>
            </div>
            <div className={styles['benefit-body']}>
              <div className={styles['benefit-title']}>ELYO-Verified Status</div>
              <div className={styles['benefit-desc']}>Nach erfolgreicher Prüfung trägst du ein Gütesiegel, das Mitarbeiter in der gesamten App sehen — klare Auffindbarkeit im lokalen Suchradius.</div>
            </div>
          </div>

          <div className={styles['benefit-row']}>
            <div className={styles['benefit-icon']}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <div className={styles['benefit-body']}>
              <div className={styles['benefit-title']}>Direkte Buchungen &amp; Level-Slots</div>
              <div className={styles['benefit-desc']}>Reserviere GOLD-Kontingente für Fast-Lane-Kunden und reagiere innerhalb 24 h — ELYO steuert den Zugang nach Mitarbeiter-Level.</div>
            </div>
          </div>

          <div className={styles['benefit-row']}>
            <div className={styles['benefit-icon']}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            </div>
            <div className={styles['benefit-body']}>
              <div className={styles['benefit-title']}>Transparente Analytics</div>
              <div className={styles['benefit-desc']}>Profilaufrufe, Angebots-Clicks und Bewertungstrends — aggregiert und in Echtzeit. Deine Daten, deine Kontrolle.</div>
            </div>
          </div>

        </div>

        <div className={styles['brand-stats']}>
          <div className={styles['brand-stat']}>
            <div className={styles['brand-stat-num']}>340+</div>
            <div className={styles['brand-stat-lbl']}>Geprüfte Partner</div>
          </div>
          <div className={styles['brand-stat']}>
            <div className={styles['brand-stat-num']}>14 Tage</div>
            <div className={styles['brand-stat-lbl']}>Ø Verifikationszeit</div>
          </div>
          <div className={styles['brand-stat']}>
            <div className={styles['brand-stat-num']}>Ø 4.8 ★</div>
            <div className={styles['brand-stat-lbl']}>Nutzerbewertung</div>
          </div>
        </div>
      </section>

      {/* ============ RECHTS: FORMULAR ============ */}
      <section className={styles['form-panel']}>

        <div className={styles['form-head']}>
          <div className={styles['form-role-pill']}>
            <span className={styles['form-role-pill-icon']}>P</span>
            Partner-Zugang
          </div>
          <h2>Willkommen zurück.</h2>
          <p>Melde dich in deinem Partner-Portal an, um Verfügbarkeiten zu pflegen, Bewertungen einzusehen und deine Angebote zu aktualisieren.</p>
        </div>

        {/* SSO */}
        <div className={styles['sso-row']}>
          <button type="button" className={styles['sso-btn']}>
            {/* Microsoft */}
            <svg width="16" height="16" viewBox="0 0 23 23" fill="none">
              <rect x="1" y="1" width="10" height="10" fill="#F35325"/>
              <rect x="12" y="1" width="10" height="10" fill="#81BC06"/>
              <rect x="1" y="12" width="10" height="10" fill="#05A6F0"/>
              <rect x="12" y="12" width="10" height="10" fill="#FFBA08"/>
            </svg>
            Microsoft
          </button>
          <button type="button" className={styles['sso-btn']}>
            {/* Google */}
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H24v7.9h11.3c-1.6 4.2-5.5 7-11.3 7A11.9 11.9 0 0112 23a11.9 11.9 0 0112-12c3 0 5.8 1.1 8 3l5.6-5.6A19.9 19.9 0 004 23a20 20 0 0020 20c11.5 0 19.6-8.1 19.6-19.6 0-1.3-.2-2.2-.4-3.3z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0124 11c3 0 5.8 1.1 8 3l5.6-5.6A19.9 19.9 0 004 23c0-3 .7-5.9 2.3-8.3z"/>
              <path fill="#4CAF50" d="M24 43a20 20 0 0013.5-5.2l-6.2-5.2a11.9 11.9 0 01-7.3 2.5c-5.8 0-9.7-2.8-11.3-7L6 32.4A20 20 0 0024 43z"/>
              <path fill="#1976D2" d="M43.6 20.1H24v7.9h11.3c-.8 2.2-2.2 4-4 5.2l6.2 5.2c-.4.4 6.5-4.8 6.5-14.7 0-1.3-.2-2.5-.4-3.6z"/>
            </svg>
            Google
          </button>
        </div>

        <div className={styles['divider']}>oder mit E-Mail anmelden</div>

        <form onSubmit={onSubmit}>
          {/* E-Mail */}
          <div className={styles['field']}>
            <div className={styles['field-label']}>
              <label htmlFor="email">Geschäftliche E-Mail</label>
            </div>
            <input
              id="email"
              name="email"
              className={styles['field-input']}
              type="email"
              placeholder="anna.berger@praxis-berger.de"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          {/* Passwort */}
          <div className={styles['field']}>
            <div className={styles['field-label']}>
              <label htmlFor="password">Passwort</label>
              <a href="#" className={styles['helper']}>Vergessen?</a>
            </div>
            <div className={styles['field-input-wrap']}>
              <input
                id="password"
                name="password"
                className={styles['field-input']}
                type="password"
                placeholder="Passwort eingeben"
                required
                style={{ paddingRight: '42px' }}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <span className={styles['field-icon-right']}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </span>
            </div>
          </div>

          {/* Angemeldet bleiben */}
          <div className={styles['row-check']}>
            <label className={styles['check-label']}>
              <span className={`${styles['check-box']} ${styles['checked']}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
              </span>
              Angemeldet bleiben (30 Tage)
            </label>
            <span style={{ fontSize: '12px', color: 'var(--elyo-ink-mute)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              2FA aktiv
            </span>
          </div>

          {error && <p style={{ color: 'var(--elyo-red, #dc2626)', fontSize: '13.5px', marginBottom: '12px' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary ${styles['btn-submit']}`}
          >
            {loading ? 'Login läuft …' : 'Als Partner anmelden'}
            {!loading && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
            )}
          </button>
        </form>

        {/* Trust Row */}
        <div className={styles['trust-row']}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          <div>
            <strong style={{ fontWeight: 600 }}>DSGVO-konform · ISO 27001 · TLS 1.3 ·</strong> Patientendaten nutzt ELYO <strong>niemals</strong> — wir vermitteln ausschließlich Kontakte. Therapeutische Dokumentation verbleibt bei dir.
          </div>
        </div>

        <div className={styles['signup-hint']}>
          Noch kein Partner-Account? <a href="#">Verifizierung als ELYO-Partner beantragen →</a>
        </div>

        <div className={styles['login-foot']}>
          <span>© 2026 ELYO GmbH · München</span>
          <span>
            <a href="#">Impressum</a>
            <a href="#">Datenschutz</a>
            <a href="#">Partner-AGB</a>
            <a href="#">Support</a>
          </span>
        </div>

      </section>

    </div>
  )
}
