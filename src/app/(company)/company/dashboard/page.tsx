export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getAggregatedMetrics,
  getTrendData,
  getContinuityData,
  currentPeriodKey,
} from '@/lib/anonymize'
import { TrendChartClient } from './TrendChartClient'
import styles from './unternehmen.module.css'

export default async function CompanyDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (
    session.user.role !== 'COMPANY_ADMIN' &&
    session.user.role !== 'COMPANY_MANAGER'
  ) {
    redirect('/dashboard')
  }

  const companyId = session.user.companyId
  if (!companyId) redirect('/auth/login')

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { name: true, anonymityThreshold: true },
  })

  const threshold = company.anonymityThreshold

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const periodKey = currentPeriodKey()

  const [totalUsers, activeUsers, periodMetrics, trendRaw, teamsRaw, continuity] =
    await Promise.all([
      prisma.user.count({ where: { companyId, isActive: true } }),
      prisma.user.count({
        where: { companyId, isActive: true, lastLoginAt: { gte: fourteenDaysAgo } },
      }),
      getAggregatedMetrics(companyId, { periodKey, threshold }),
      getTrendData(companyId, { limit: 12, threshold }),
      prisma.team.findMany({
        where: { companyId },
        include: { _count: { select: { members: true } } },
      }),
      getContinuityData(companyId, { threshold }),
    ])

  // Per-team aggregation with anonymity threshold
  const teamAggs = await Promise.all(
    teamsRaw.map(async (t) => {
      const m = await getAggregatedMetrics(companyId, {
        teamId: t.id,
        periodKey,
        threshold,
      })
      if (!m.isAboveThreshold) {
        return {
          id: t.id,
          name: t.name,
          memberCount: t._count.members,
          participation: 0,
          vitalityIndex: null as number | null,
          avgStress: null as number | null,
          hidden: true,
        }
      }
      const entries = await prisma.wellbeingEntry.count({
        where: { companyId, user: { teamId: t.id }, periodKey },
      })
      return {
        id: t.id,
        name: t.name,
        memberCount: t._count.members,
        participation: Math.round((entries / Math.max(1, t._count.members)) * 100),
        vitalityIndex: Math.round(m.avgScore * 10),
        avgStress: m.avgStress,
        hidden: false,
      }
    })
  )

  const visibleTeams = teamAggs.filter((t) => !t.hidden)
  const hiddenCount = teamAggs.filter((t) => t.hidden).length

  // Sort by stress descending (at-risk first), then vitality ascending
  const sortedTeams = [...visibleTeams].sort((a, b) => {
    const stressA = a.avgStress ?? 0
    const stressB = b.avgStress ?? 0
    return stressB - stressA
  })

  const atRisk = visibleTeams
    .filter((t) => t.avgStress !== null && t.avgStress >= 7.0)
    .sort((a, b) => (b.avgStress ?? 0) - (a.avgStress ?? 0))
    .slice(0, 5)

  const vitalityIndex = periodMetrics.isAboveThreshold
    ? Math.round(periodMetrics.avgScore * 10)
    : null
  const avgEnergy = periodMetrics.isAboveThreshold ? periodMetrics.avgEnergy : null
  const avgStress = periodMetrics.isAboveThreshold ? periodMetrics.avgStress : null
  const avgMood = periodMetrics.isAboveThreshold ? periodMetrics.avgMood : null

  const trendData = trendRaw.map((t) => ({
    period: t.period,
    vitalityIndex: Math.round(t.avgScore * 10),
  }))

  const activationRate =
    totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0

  return (
    <div className={styles.dashRoot}>

      {/* ── HERO BAND ── */}
      <div className={styles.heroBand}>
        <div className={styles.companyLine}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--elyo-amber-300)',
              display: 'inline-block',
            }}
          />
          {company.name.toUpperCase()} · BERICHTSZEITRAUM {periodKey}
        </div>
        <h1 className={styles.heroBandH1}>
          Unternehmensübersicht — <em>Anonymisierte Wellbeing-Daten</em>
        </h1>
        <p className={styles.heroBandLead}>
          {atRisk.length > 0
            ? `${atRisk.length} Team${atRisk.length > 1 ? 's' : ''} weist erhöhte Belastungs-Indikatoren auf — ein gezielter Maßnahmenvorschlag liegt bereit.`
            : 'Alle Teams liegen aktuell im grünen Bereich — keine erhöhten Belastungssignale erkennbar.'}
        </p>

        <div className={styles.heroStats}>
          <div>
            <div className={styles.heroStatLabel}>Aktive Nutzer</div>
            <div className={styles.heroStatValue}>
              {activeUsers} / {totalUsers}
            </div>
            <div className={styles.heroStatFoot}>{activationRate} % Aktivierungsquote</div>
          </div>
          <div>
            <div className={styles.heroStatLabel}>Teilnahme-Kontinuität</div>
            <div className={styles.heroStatValue}>
              {continuity.isAboveThreshold ? `${continuity.continuityRate} %` : '–'}
            </div>
            <div className={styles.heroStatFoot}>
              {continuity.isAboveThreshold
                ? `${continuity.checkedInThisPeriod} Einträge diese Periode`
                : 'Nicht genug Daten'}
            </div>
          </div>
          <div>
            <div className={styles.heroStatLabel}>Krankheitstage</div>
            <div className={styles.heroStatValue}>–</div>
            <div className={styles.heroStatFoot}>Nicht erfasst</div>
          </div>
        </div>
      </div>

      {/* ── KPI-LEISTE ── */}
      <div className={styles.kpiGrid}>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Vitalitäts-Index</div>
          <div className={styles.metricValue}>
            {vitalityIndex !== null ? vitalityIndex : '–'}
            {vitalityIndex !== null && (
              <span className={styles.metricUnit}>/100</span>
            )}
          </div>
          <div className={styles.metricFoot}>
            <span className={styles.trendFlat}>→ aktuell</span>
            <span className={styles.muted}>{periodKey}</span>
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricLabel}>Ø Energie-Signal</div>
          <div className={styles.metricValue}>
            {avgEnergy !== null ? avgEnergy.toFixed(1) : '–'}
            {avgEnergy !== null && (
              <span className={styles.metricUnit}>/10</span>
            )}
          </div>
          <div className={styles.metricFoot}>
            <span className={styles.trendFlat}>→ stabil</span>
            <span className={styles.muted}>Periodenmittel</span>
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricLabel}>Belastungs-Signal</div>
          <div className={styles.metricValue}>
            {avgStress !== null ? avgStress.toFixed(1) : '–'}
            {avgStress !== null && (
              <span className={styles.metricUnit}>/10</span>
            )}
          </div>
          <div className={styles.metricFoot}>
            {avgStress !== null && avgStress >= 7 ? (
              <span className={styles.trendDown}>▲ Erhöht</span>
            ) : (
              <span className={styles.trendFlat}>→ stabil</span>
            )}
            <span className={styles.muted}>
              {atRisk.length > 0 ? `Anstieg ${atRisk.length} Teams` : 'Kein Anstieg'}
            </span>
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricLabel}>Krankheitstage (Vormonat)</div>
          <div className={styles.metricValue}>–</div>
          <div className={styles.metricFoot}>
            <span className={styles.muted}>Nicht erfasst</span>
          </div>
        </div>
      </div>

      {/* ── DATENSCHUTZ-HINWEIS ── */}
      <div className={`${styles.privacyNote} ${styles.mb6}`}>
        <svg
          className={styles.privacyNoteIcon}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <div>
          <strong>
            Alle Analysen basieren auf anonymisierten Aggregatdaten (min.{' '}
            {threshold} Einträge).
          </strong>{' '}
          Individualwerte sind technisch nicht einsehbar. Betriebsrat &amp; DSB haben
          Lesezugriff auf dasselbe Dashboard.
        </div>
      </div>

      {/* ── INDEX-GAUGE + AT-RISK-RADAR ── */}
      <div className={`${styles.grid32} ${styles.mb5}`}>

        {/* Index Gauge + Subdimensionen */}
        <div className={styles.indexGaugeCard}>
          <div className={styles.gaugeWrap}>
            {vitalityIndex !== null ? (
              <svg width="200" height="120" viewBox="0 0 200 120">
                <defs>
                  <linearGradient id="g1" x1="0" x2="1">
                    <stop offset="0" stopColor="#1B4D3E" />
                    <stop offset="1" stopColor="#C8913A" />
                  </linearGradient>
                </defs>
                {/* Background arc */}
                <path
                  d="M 20 110 A 80 80 0 0 1 180 110"
                  fill="none"
                  stroke="#EEF3F1"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Value arc: vitalityIndex/100 → percentage of π */}
                <path
                  d="M 20 110 A 80 80 0 0 1 180 110"
                  fill="none"
                  stroke="url(#g1)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray="251.3"
                  strokeDashoffset={251.3 * (1 - vitalityIndex / 100)}
                />
                <circle cx="20" cy="110" r="3" fill="#1B4D3E" />
                <circle cx="100" cy="30" r="3" fill="#C8913A" />
                <circle cx="180" cy="110" r="3" fill="#9FBEB1" opacity="0.6" />
                <text
                  x="100"
                  y="88"
                  textAnchor="middle"
                  fontFamily="Fraunces"
                  fontSize="44"
                  fontWeight="500"
                  fill="#1A1C1A"
                >
                  {vitalityIndex}
                </text>
                <text
                  x="100"
                  y="108"
                  textAnchor="middle"
                  fontFamily="DM Sans"
                  fontSize="11"
                  fill="#8E8F86"
                  letterSpacing="1"
                >
                  INDEX /100
                </text>
              </svg>
            ) : (
              <div
                style={{
                  width: 200,
                  height: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--elyo-ink-mute)',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                Noch keine Daten
              </div>
            )}
          </div>
          <div className={styles.gaugeInfo}>
            <h2 className={styles.gaugeInfoH2}>Vitalitäts-Index Unternehmen</h2>
            <div className={styles.gaugeMeta}>
              Zusammengesetzt aus Energie, Stimmung, Belastung (invertiert) ·
              Gewichtung 40/40/20
            </div>
            <div className={styles.splitBars}>
              <div className={styles.splitBarRow}>
                <span className={styles.splitBarRowLbl}>Energie-Signal</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: avgEnergy !== null ? `${avgEnergy * 10}%` : '0%' }}
                  />
                </div>
                <span className={styles.splitBarRowVal}>
                  {avgEnergy !== null ? avgEnergy.toFixed(1) : '–'}
                </span>
              </div>
              <div className={styles.splitBarRow}>
                <span className={styles.splitBarRowLbl}>Stimmungs-Signal</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: avgMood !== null ? `${avgMood * 10}%` : '0%' }}
                  />
                </div>
                <span className={styles.splitBarRowVal}>
                  {avgMood !== null ? avgMood.toFixed(1) : '–'}
                </span>
              </div>
              <div className={styles.splitBarRow}>
                <span className={styles.splitBarRowLbl}>Belastungs-Signal</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFillRisk}
                    style={{ width: avgStress !== null ? `${avgStress * 10}%` : '0%' }}
                  />
                </div>
                <span className={styles.splitBarRowVal}>
                  {avgStress !== null ? avgStress.toFixed(1) : '–'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AT-RISK RADAR */}
        <div className={styles.radarCard}>
          <div className={styles.radarHead}>
            <div>
              <div className={styles.radarTitleRow}>
                <h3 className={styles.radarTitleRowH3}>At-Risk-Radar</h3>
                {atRisk.length > 0 ? (
                  <span className={styles.riskPill}>{atRisk.length} Teams</span>
                ) : (
                  <span className={styles.riskPillOk}>Grün</span>
                )}
              </div>
              <div className={styles.cardSub ?? ''} style={{ fontSize: 12.5, color: 'var(--elyo-ink-mute)' }}>
                Erhöhte Belastungs-Indikatoren · letzte 14 Tage
              </div>
            </div>
          </div>

          {atRisk.length === 0 ? (
            <div className={styles.radarOkBanner}>
              Keine Teams im At-Risk-Bereich — alle Belastungswerte im normalen Rahmen.
            </div>
          ) : (
            atRisk.map((team) => (
              <div key={team.id} className={styles.radarTeam}>
                <div>
                  <div className={styles.radarTeamName}>{team.name}</div>
                  <div className={styles.radarTeamStats}>
                    <span>{team.memberCount} Mitarbeiter</span>
                    <span>·</span>
                    <span className={styles.radarTeamStatsBurden}>
                      ▲ {team.avgStress?.toFixed(1)} /10
                    </span>
                    <span className={styles.muted}>Trend steigend</span>
                  </div>
                </div>
                <Link href="/company/teams" className={`${styles.btnGhost} ${styles.btnGhostSm}`}>
                  Maßnahme →
                </Link>
              </div>
            ))
          )}

          <div className={styles.radarNote}>
            <strong className={styles.radarNoteStrong}>Hinweis:</strong> Signal-Erhöhungen
            sind Frühindikatoren, keine Diagnosen. Maßnahmenempfehlungen sind strukturelle
            Interventionen auf Team-Ebene.
          </div>
        </div>
      </div>

      {/* ── TREND-CHART + QUICK ACTIONS ── */}
      <div className={`${styles.grid32} ${styles.mb5}`}>

        {/* Trend Chart */}
        <div className={styles.chartCard}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Vitalitäts-Index · 12 Wochen</div>
              <div className={styles.cardSub ?? ''} style={{ fontSize: 12.5, color: 'var(--elyo-ink-mute)' }}>
                Wochenaggregate · anonymisiert (n ≥ {threshold})
              </div>
            </div>
            <div className={styles.legendPills}>
              <span className={styles.legendPillsSpan}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: 'var(--elyo-green-500)' }}
                />
                Index
              </span>
            </div>
          </div>

          <TrendChartClient data={trendData} />

          <div className={styles.chartFooter}>
            {trendData.length > 0 ? (
              <>
                <span>
                  Niedrigster Wert: {Math.min(...trendData.map((d) => d.vitalityIndex))} (
                  {trendData.reduce((min, d) =>
                    d.vitalityIndex < min.vitalityIndex ? d : min
                  ).period}
                  )
                </span>
                <span>
                  Höchster Wert:{' '}
                  {Math.max(...trendData.map((d) => d.vitalityIndex))} (
                  {trendData.reduce((max, d) =>
                    d.vitalityIndex > max.vitalityIndex ? d : max
                  ).period}
                  )
                </span>
              </>
            ) : (
              <span>Noch keine Trend-Daten verfügbar</span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActionsCard}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>Schnellzugriffe</div>
          </div>

          <Link href="/company/reports" className={styles.quickAction}>
            <div className={styles.qaIcon}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className={styles.qaText}>
              <div className={styles.qaTitle}>ESG-Report exportieren</div>
              <div className={styles.qaMeta}>CSV · PDF · Audit-Trail</div>
            </div>
            <span className={styles.qaArrow}>→</span>
          </Link>

          <Link href="/company/surveys" className={styles.quickAction}>
            <div className={styles.qaIcon}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 19V6l12-3v13M9 19c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z" />
              </svg>
            </div>
            <div className={styles.qaText}>
              <div className={styles.qaTitle}>Neue Umfrage erstellen</div>
              <div className={styles.qaMeta}>Vorlagen verfügbar</div>
            </div>
            <span className={styles.qaArrow}>→</span>
          </Link>

          <Link href="/company/employees" className={styles.quickAction}>
            <div className={styles.qaIcon}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 7.5a4 4 0 110 8 4 4 0 010-8zM20 8v6m-3-3h6" />
              </svg>
            </div>
            <div className={styles.qaText}>
              <div className={styles.qaTitle}>Mitarbeiter einladen</div>
              <div className={styles.qaMeta}>
                {totalUsers - activeUsers} offene Plätze
              </div>
            </div>
            <span className={styles.qaArrow}>→</span>
          </Link>

          <Link href="/company/measures" className={styles.quickAction}>
            <div className={styles.qaIcon}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className={styles.qaText}>
              <div className={styles.qaTitle}>Maßnahmen-Hub öffnen</div>
              <div className={styles.qaMeta}>
                {atRisk.length > 0
                  ? `${atRisk.length} Vorschläge bereit`
                  : 'Keine aktiven Vorschläge'}
              </div>
            </div>
            <span className={styles.qaArrow}>→</span>
          </Link>
        </div>
      </div>

      {/* ── TEAM-TABELLE ── */}
      <div className={`${styles.chartCard} ${styles.mb5}`}>
        <div className={styles.cardHead}>
          <div>
            <div className={styles.cardTitle}>Team-Vitalität</div>
            <div className={styles.cardSub ?? ''} style={{ fontSize: 12.5, color: 'var(--elyo-ink-mute)' }}>
              Sortiert nach Risiko-Signal · nur aggregierte Werte
            </div>
          </div>
          <Link href="/company/teams" className={`${styles.btnGhost} ${styles.btnGhostSm}`}>
            Alle Teams →
          </Link>
        </div>

        {visibleTeams.length === 0 ? (
          <div className={styles.noDataState}>
            Keine Teams mit ausreichend Daten (min. {threshold} Einträge pro Team)
          </div>
        ) : (
          <table className={styles.teamTable}>
            <thead>
              <tr>
                <th>Team</th>
                <th>Mitglieder</th>
                <th>Beteiligung</th>
                <th>Vitalitäts-Index</th>
                <th>Belastung</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team) => {
                const isRisk = team.avgStress !== null && team.avgStress >= 7.0
                const isAmber = team.avgStress !== null && team.avgStress >= 5.5 && team.avgStress < 7.0
                return (
                  <tr key={team.id}>
                    <td>
                      <strong>{team.name}</strong>
                    </td>
                    <td>{team.memberCount}</td>
                    <td>
                      <span className={styles.participationBadge}>
                        {team.participation} %
                      </span>
                    </td>
                    <td>
                      {team.vitalityIndex !== null ? (
                        <span
                          className={
                            isRisk
                              ? styles.chipRisk
                              : isAmber
                              ? styles.chipAmber
                              : styles.chip
                          }
                        >
                          <span className={styles.chipDot} />
                          {team.vitalityIndex}
                        </span>
                      ) : (
                        <span className={styles.muted}>–</span>
                      )}
                    </td>
                    <td>
                      {team.avgStress !== null ? (
                        <span className={isRisk ? styles.trendDown : styles.muted}>
                          {isRisk ? '▲ ' : ''}
                          {team.avgStress.toFixed(1)}
                        </span>
                      ) : (
                        <span className={styles.muted}>–</span>
                      )}
                    </td>
                    <td>
                      {isRisk ? (
                        <Link href="/company/teams" className={styles.chipAmber}>
                          Maßnahme →
                        </Link>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {hiddenCount > 0 && (
          <div className={styles.hiddenTeamsNotice}>
            Weitere {hiddenCount} Team{hiddenCount > 1 ? 's' : ''} (n &lt; {threshold}) —
            zu wenig Einträge für anonymisierte Anzeige
          </div>
        )}
      </div>

      {/* ── ESG CARD ── */}
      <div className={styles.esgCard}>
        <div className={styles.esgCardInner}>
          <div className={styles.esgCardContent}>
            <h3 className={styles.esgCardH3}>ESG-Berichterstattung · Bereit für CSRD</h3>
            <p className={styles.esgCardP}>
              ELYO exportiert Vitalitäts-Kennzahlen, Teilnahmequoten und Maßnahmen-Effekte
              in standardisierte CSV- und PDF-Berichte mit Audit-Trail. Alle Werte erfüllen
              die Anonymitätsschwelle und sind betriebsratstauglich.
            </p>
            <div className={styles.esgCardActions}>
              <Link href="/company/reports" className={styles.btnPrimary}>
                CSV exportieren
              </Link>
              <Link href="/company/reports" className={styles.btnGhost}>
                PDF-Bericht generieren
              </Link>
              <Link href="/company/reports" className={styles.btnGhost}>
                Audit-Trail öffnen
              </Link>
            </div>
          </div>
          <div className={styles.esgCardSidebar}>
            <div className={styles.metricLabel} style={{ marginBottom: 4 }}>
              Anonymitäts-Schwelle
            </div>
            <div className={styles.metricValue} style={{ fontSize: 22 }}>
              {threshold}
            </div>
            <div className={`${styles.metricFoot} ${styles.muted}`} style={{ justifyContent: 'flex-end' }}>
              min. Einträge
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
