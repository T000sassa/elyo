'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import styles from './mitarbeiter.module.css'

export interface DashboardData {
  greeting: string
  userName: string
  streak: number
  hasCheckinToday: boolean
  score: number | null
  scoreHistory: Array<{ day: string; score: number }>
  metrics: { energy: number | null; mood: number | null; stress: number | null }
  level: { current: string; total: number; threshold: number; nextLevel: string | null }
  privileges: Array<{ id: string; label: string; locked: boolean }>
  partners: Array<{ id: string; name: string; type: string; city: string | null }>
  surveys: Array<{ id: string; title: string; minutes: number }>
}

function getPartnerImgClass(type: string): string {
  const t = type.toUpperCase()
  if (t === 'YOGA' || t === 'FITNESS') return styles['yoga']
  if (t === 'MEDICAL' || t === 'PHYSIOTHERAPY') return styles['doctor']
  if (t === 'DIGITAL' || t === 'ONLINE') return styles['online']
  return ''
}

function getPartnerIcon(type: string): string {
  const t = type.toUpperCase()
  if (t === 'YOGA' || t === 'FITNESS') return '🧘'
  if (t === 'MEDICAL' || t === 'PHYSIOTHERAPY') return '🌿'
  if (t === 'DIGITAL' || t === 'ONLINE') return '🌙'
  return '🏢'
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const {
    greeting,
    userName,
    streak,
    hasCheckinToday,
    score,
    scoreHistory,
    metrics,
    level,
    privileges,
    partners,
    surveys,
  } = data

  const progressPct =
    level.nextLevel === null
      ? 100
      : Math.min(100, Math.round((level.total / level.threshold) * 100))

  const pointsLeft = level.nextLevel === null ? 0 : Math.max(0, level.threshold - level.total)

  return (
    <motion.div
      className={styles['dashboard-root']}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* GREETING */}
      <div className={styles['greeting-card']}>
        {streak > 0 && (
          <div className={styles['streak-flame']}>
            <span className={styles['flame']}>🔥</span>
            <div>
              <div className={styles['num']}>{streak} Tage</div>
              <div className={styles['lbl']}>Check-in-Serie</div>
            </div>
          </div>
        )}

        <div className={styles['greeting-tag']}>◇ {greeting} · Mitarbeiter-Dashboard</div>
        <h1>
          Hallo {userName}, <em>schön dass du da bist.</em>
        </h1>
        <p>
          {score !== null
            ? 'Dein Vitalitäts-Score zeigt eine leicht aufsteigende Tendenz über die letzten sieben Tage. Zeit für den heutigen Check-in?'
            : 'Starte deinen ersten Check-in und erhalte deinen persönlichen Vitalitäts-Score.'}
        </p>

        {hasCheckinToday ? (
          <div className={styles['checkin-done']}>
            ✓ Heute erledigt
          </div>
        ) : (
          <Link href="/checkin" className={styles['checkin-cta']}>
            <span className={styles['pulse']}></span>
            Heute einchecken · ~30 Sek.
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* SCORE + LEVEL */}
      <div className="grid grid-3-2 mb-5">

        {/* Score Card */}
        <div className={styles['score-card']}>
          <div className={styles['gauge-big']}>
            <svg width="220" height="140" viewBox="0 0 220 140">
              <defs>
                <linearGradient id="scg" x1="0" x2="1">
                  <stop offset="0" stopColor="#2E7D5B" />
                  <stop offset="1" stopColor="#C8913A" />
                </linearGradient>
              </defs>
              <path
                d="M 20 120 A 90 90 0 0 1 200 120"
                fill="none"
                stroke="#EEF3F1"
                strokeWidth="16"
                strokeLinecap="round"
              />
              {score !== null && (
                <path
                  d="M 20 120 A 90 90 0 0 1 200 120"
                  fill="none"
                  stroke="url(#scg)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  strokeDashoffset={Math.round(283 - (score / 100) * 283)}
                />
              )}
            </svg>
            <div className={styles['gauge-center']}>
              <div className={styles['gauge-num']}>{score ?? '–'}</div>
              <div className={styles['gauge-sub']}>dein vitalitäts-score</div>
            </div>
          </div>
          <div className={styles['score-info']}>
            <h2>{score !== null ? 'Gute Balance diese Woche.' : 'Noch kein Score verfügbar.'}</h2>
            <p>
              {score !== null
                ? 'Dein Score kombiniert Energie, Stimmung und Belastung. Weiter so.'
                : 'Mach deinen ersten Check-in, um deinen Vitalitäts-Score zu sehen.'}
            </p>
            <div className={styles['score-chips']}>
              <div className={styles['metric-chip']}>
                <span className={styles['mc-lbl']}>Energie</span>
                <span className={styles['mc-val']}>
                  {metrics.energy ?? '–'}
                  {metrics.energy !== null && <span className={styles['unit']}>/10</span>}
                </span>
              </div>
              <div className={styles['metric-chip']}>
                <span className={styles['mc-lbl']}>Stimmung</span>
                <span className={styles['mc-val']}>
                  {metrics.mood ?? '–'}
                  {metrics.mood !== null && <span className={styles['unit']}>/10</span>}
                </span>
              </div>
              <div className={styles['metric-chip']}>
                <span className={styles['mc-lbl']}>Belastung</span>
                <span className={styles['mc-val']}>
                  {metrics.stress ?? '–'}
                  {metrics.stress !== null && <span className={styles['unit']}>/10</span>}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Level Card */}
        <div className={styles['level-card']}>
          <div className={styles['level-card-head']}>
            <div>
              <div className={styles['level-label']}>Dein Level</div>
              <div className={styles['level-name']}>{level.current}</div>
              <div className={styles['level-days']}>{level.total} Punkte gesammelt</div>
            </div>
            <div className={styles['level-emblem']}>◆</div>
          </div>

          {level.nextLevel !== null ? (
            <div className={styles['level-progress-wrap']}>
              <div className={styles['level-progress-head']}>
                <span>
                  Auf dem Weg zu <strong>{level.nextLevel}</strong>
                </span>
                <span className={styles['pct']}>{progressPct} %</span>
              </div>
              <div className={styles['level-progress-track']}>
                <div
                  className={styles['level-progress-fill']}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className={styles['level-progress-labels']}>
                <span>{level.current}</span>
                <span>Noch {pointsLeft} Punkte</span>
                <span>{level.nextLevel}</span>
              </div>
            </div>
          ) : (
            <div className={styles['level-maxed']}>
              🏆 PLATINUM — Maximales Level erreicht!
            </div>
          )}

          <div className={styles['privilege-list']}>
            {privileges.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className={`${styles['privilege']}${p.locked ? ` ${styles['locked']}` : ''}`}
              >
                <div className={styles['p-icon']}>
                  {p.locked ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
                <div className={styles['p-text']}>
                  {p.label}
                  {p.locked && level.nextLevel && (
                    <small style={{ display: 'block' }}>Ab {level.nextLevel} freigeschaltet</small>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MINI-CHARTS ROW */}
      <div className="grid grid-4 mb-5">
        {/* Verlauf 7 Tage */}
        <div className={styles['spark-card']}>
          <div className={styles['spark-lbl']}>◇ Verlauf 7 Tage</div>
          <div className={styles['spark-val']}>{score ?? '–'}</div>
          <div className={styles['spark-line']}>
            {scoreHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={scoreHistory}>
                  <XAxis dataKey="day" hide />
                  <Tooltip
                    contentStyle={{ background: '#0a1f1c', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
                    formatter={(v: number | undefined) => v !== undefined ? [`${v}`, 'Score'] : [v, 'Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--elyo-green-500)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--elyo-ink-mute)', fontSize: 12 }}>
                Noch keine Daten
              </div>
            )}
          </div>
        </div>

        {/* Aktive Serie */}
        <div className={styles['spark-card']}>
          <div className={styles['spark-lbl']}>🔥 Aktive Serie</div>
          <div className={styles['spark-val']}>{streak > 0 ? `${streak} Tage` : '–'}</div>
          {streak > 0 && (
            <div className={styles['spark-line']} style={{ display: 'flex', gap: '3px', marginTop: '14px' }}>
              {Array.from({ length: Math.min(streak, 14) }).map((_, i) => {
                const age = Math.min(streak, 14) - i
                const bg = age <= 3 ? '#F4DFB4' : age <= 7 ? '#E0B565' : '#C8913A'
                return (
                  <span
                    key={i}
                    style={{ flex: 1, height: '22px', background: bg, borderRadius: '2px' }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Score dieser Woche */}
        <div className={styles['spark-card']}>
          <div className={styles['spark-lbl']}>◇ Score dieser Woche</div>
          <div className={styles['spark-val']}>{score !== null ? `${score}` : '–'}<span style={{ fontSize: 12, color: 'var(--elyo-ink-mute)', fontWeight: 500 }}> /100</span></div>
          <div className={styles['spark-line']} style={{ marginTop: '18px' }}>
            <div className="progress">
              <div className="progress-bar" style={{ width: score !== null ? `${score}%` : '0%' }} />
            </div>
          </div>
        </div>

        {/* Punkte */}
        <div className={styles['spark-card']}>
          <div className={styles['spark-lbl']}>⚡ Punkte gesamt</div>
          <div className={styles['spark-val']}>
            {level.total}{' '}
            {level.nextLevel && (
              <span style={{ fontSize: 12, color: 'var(--elyo-ink-mute)', fontWeight: 500 }}>
                von {level.threshold} zu {level.nextLevel}
              </span>
            )}
          </div>
          <div className={styles['spark-line']} style={{ marginTop: '18px' }}>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* PARTNERS IN DER NÄHE */}
      <div className="card mb-5">
        <div className="card-head">
          <div>
            <div className="card-title">Partner in deiner Nähe</div>
            <div className="card-sub">
              {partners.length > 0
                ? `${partners.length} geprüfte Angebote · ${level.current}-Vorteile aktiv`
                : 'Geprüfte Gesundheitspartner für dich'}
            </div>
          </div>
          <Link href="/partners" className="btn btn-ghost btn-sm">
            Alle Partner →
          </Link>
        </div>

        {partners.length === 0 ? (
          <div className={styles['partners-empty']}>
            Bald mehr Partner in deiner Region
          </div>
        ) : (
          <div className={styles['partners-strip']}>
            {partners.map((p) => (
              <div key={p.id} className={styles['partner-card-sm']}>
                <div className={`${styles['partner-img']} ${getPartnerImgClass(p.type)}`}>
                  <span className={styles['verified-pill']}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    VERIFIED
                  </span>
                  <span className={styles['partner-type-icon']}>{getPartnerIcon(p.type)}</span>
                </div>
                <div className={styles['partner-body']}>
                  <div className={styles['partner-name']}>{p.name}</div>
                  <div className={styles['partner-meta']}>
                    <span>{p.type}</span>
                    {p.city && (
                      <>
                        <span>·</span>
                        <span>{p.city}</span>
                      </>
                    )}
                    {p.type.toUpperCase() === 'DIGITAL' && (
                      <>
                        <span>·</span>
                        <span>digital</span>
                      </>
                    )}
                  </div>
                  <div className={styles['partner-foot']}>
                    <span className={styles['rating']}>
                      <span className={styles['star']}>★</span> ELYO
                    </span>
                    <span className={`${styles['level-tag']} ${styles['all']}`}>Für alle</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SURVEYS + PRIVACY */}
      <div className="grid grid-2 mb-5">

        {/* Surveys */}
        {surveys.length > 0 && (
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Offene Umfragen</div>
                <div className="card-sub">Deine Teilnahme bleibt anonym</div>
              </div>
              <span className="chip amber">+10 Punkte</span>
            </div>

            {surveys.map((s, idx) => (
              <div
                key={s.id}
                className={`${styles['survey-card']}${idx < surveys.length - 1 ? ' mb-3' : ''}`}
              >
                <div className={styles['survey-icon']}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 19V6l12-3v13M9 19c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z" />
                  </svg>
                </div>
                <div className={styles['survey-body']}>
                  <div className={styles['survey-title']}>{s.title}</div>
                  <div className={styles['survey-meta']}>~{s.minutes} Min.</div>
                </div>
                <Link href={`/surveys/${s.id}`} className="btn btn-amber btn-sm">
                  Ausfüllen
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Privacy Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--elyo-green-50), var(--elyo-surface))' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Deine Daten gehören dir</div>
              <div className="card-sub">Transparenz-Überblick</div>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--elyo-green-500)" strokeWidth="2">
              <path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              {
                title: 'Dein Arbeitgeber sieht nur aggregierte Teamwerte',
                sub: 'Einzel-Check-ins sind technisch nicht zugreifbar.',
              },
              {
                title: 'Wearable-Daten bleiben auf deinem Gerät',
                sub: 'Synchronisation anonymisiert · DSGVO-konform.',
              },
              {
                title: 'Export & Löschen jederzeit möglich',
                sub: 'Ein Klick. Sofort. Ohne Begründung.',
              },
            ].map((item, idx, arr) => (
              <div
                key={item.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 0',
                  borderBottom: idx < arr.length - 1 ? '1px solid var(--elyo-line)' : 'none',
                }}
              >
                <span
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'var(--elyo-green-100)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--elyo-green-700)" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <div style={{ flex: 1, fontSize: '13.5px' }}>
                  <strong style={{ color: 'var(--elyo-ink)' }}>{item.title}</strong>
                  <br />
                  <span style={{ color: 'var(--elyo-ink-mute)', fontSize: '12.5px' }}>{item.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-ghost btn-sm" style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}>
            Privatsphäre-Einstellungen öffnen →
          </button>
        </div>

      </div>
    </motion.div>
  )
}
