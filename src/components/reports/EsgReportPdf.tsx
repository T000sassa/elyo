import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ReportData } from '@/lib/esgReport'

export function generateComment(kpis: ReportData['kpis']): string {
  let text: string
  if (kpis.vitalityIndex >= 7.5) {
    text = 'Sehr guter Vitalitätszustand im Berichtszeitraum.'
  } else if (kpis.vitalityIndex >= 6.0) {
    text = 'Solider Vitalitätszustand im Berichtszeitraum.'
  } else if (kpis.vitalityIndex > 0) {
    text = 'Verbesserungspotenzial beim Vitalitätszustand.'
  } else {
    text = 'Keine Daten für den Berichtszeitraum vorhanden.'
  }
  if (kpis.participationRate > 0 && kpis.participationRate < 0.6) {
    text += ' Partizipationsrate unter 60 % – Engagement der Mitarbeiter fördern.'
  }
  return text
}

function trendArrow(trend: number | null): { symbol: string; color: string } {
  if (trend === null || trend === 0) return { symbol: '–', color: '#9ca3af' }
  if (trend > 0) return { symbol: `\u25b2 +${trend}`, color: '#059669' }
  return { symbol: `\u25bc ${trend}`, color: '#dc2626' }
}

const ELYO_GREEN = '#1B4D3E'
const FOOTER_TEXT = 'Erstellt mit ELYO \u00b7 Alle Daten anonymisiert und DSGVO-konform \u00b7 elyo.de'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10 },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
  coverPage: { backgroundColor: ELYO_GREEN, justifyContent: 'center', alignItems: 'center' },
  coverTitle: { fontSize: 48, fontFamily: 'Helvetica-Bold', color: 'white', marginBottom: 16 },
  coverSubtitle: { fontSize: 24, color: 'white', marginBottom: 12 },
  coverCompany: { fontSize: 18, color: 'white', marginBottom: 8 },
  coverDate: { fontSize: 11, color: '#a7c4bc' },
  kpiRow: { flexDirection: 'row', marginBottom: 16 },
  kpiBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
    marginRight: 6,
  },
  kpiLabel: { fontSize: 8, color: '#6b7280', marginBottom: 4, textAlign: 'center' },
  kpiValue: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: ELYO_GREEN },
  kpiTrend: { fontSize: 9, marginTop: 2 },
  commentText: { fontSize: 10, color: '#374151', lineHeight: 1.5, marginTop: 8 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: ELYO_GREEN,
    marginBottom: 6,
    marginTop: 14,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: ELYO_GREEN,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: { fontSize: 9, color: 'white', fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4 },
  tableRowAlt: { backgroundColor: '#f9fafb' },
  tableCell: { fontSize: 9, color: '#374151' },
  anonymityNote: { fontSize: 8, color: '#6b7280', marginTop: 6 },
  csrdHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  csrdHeaderCell: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  methodNote: { fontSize: 8, color: '#6b7280', marginTop: 14, lineHeight: 1.4 },
})

function PageFooter() {
  return <Text style={styles.footer}>{FOOTER_TEXT}</Text>
}

function CoverPage({ data }: { data: ReportData }) {
  const createdAt = new Date().toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  return (
    <Page size="A4" style={[styles.page, styles.coverPage]}>
      <Text style={styles.coverTitle}>ELYO</Text>
      <Text style={styles.coverSubtitle}>Vitalit\u00e4tsbericht {data.period.label}</Text>
      <Text style={styles.coverCompany}>{data.company.name}</Text>
      <Text style={styles.coverDate}>{createdAt}</Text>
      <PageFooter />
    </Page>
  )
}

function ExecutiveSummaryPage({ data }: { data: ReportData }) {
  const { kpis } = data
  const arrow = trendArrow(kpis.vitalityTrend)
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Vitalit\u00e4ts-Index</Text>
          <Text style={styles.kpiValue}>{kpis.vitalityIndex}</Text>
          <Text style={[styles.kpiTrend, { color: arrow.color }]}>{arrow.symbol}</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Partizipationsrate</Text>
          <Text style={styles.kpiValue}>{Math.round(kpis.participationRate * 100)}%</Text>
          <Text style={styles.kpiTrend}> </Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>\u00d8 Energie</Text>
          <Text style={styles.kpiValue}>{kpis.avgEnergy}</Text>
          <Text style={styles.kpiTrend}> </Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>\u00d8 Belastung</Text>
          <Text style={styles.kpiValue}>{kpis.avgStress}</Text>
          <Text style={styles.kpiTrend}> </Text>
        </View>
      </View>
      <Text style={styles.commentText}>{generateComment(kpis)}</Text>
      <PageFooter />
    </Page>
  )
}

function TrendAndTeamsPage({ data }: { data: ReportData }) {
  const hasAnonymized = data.teamBreakdown.some(t => t.teamName.startsWith('Weitere Teams'))
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Trend</Text>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Periode</Text>
        <Text style={[styles.tableHeaderCell, { width: '32.5%' }]}>Vitalit\u00e4ts-Index</Text>
        <Text style={[styles.tableHeaderCell, { width: '32.5%' }]}>Partizipationsrate</Text>
      </View>
      {data.trendData.map((point, i) => (
        <View key={point.period} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
          <Text style={[styles.tableCell, { width: '35%' }]}>{point.period}</Text>
          <Text style={[styles.tableCell, { width: '32.5%' }]}>
            {point.vitalityIndex !== null ? String(point.vitalityIndex) : '\u2013'}
          </Text>
          <Text style={[styles.tableCell, { width: '32.5%' }]}>
            {point.participationRate !== null
              ? `${Math.round(point.participationRate * 100)}%`
              : '\u2013'}
          </Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Teams</Text>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Team</Text>
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Mitglieder</Text>
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Partizipation</Text>
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Index</Text>
      </View>
      {data.teamBreakdown.map((entry, i) => (
        <View key={entry.teamName} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
          <Text style={[styles.tableCell, { width: '40%' }]}>{entry.teamName}</Text>
          <Text style={[styles.tableCell, { width: '20%' }]}>{entry.memberCount}</Text>
          <Text style={[styles.tableCell, { width: '20%' }]}>
            {Math.round(entry.participationRate * 100)}%
          </Text>
          <Text style={[styles.tableCell, { width: '20%' }]}>{entry.vitalityIndex}</Text>
        </View>
      ))}
      {hasAnonymized && (
        <Text style={styles.anonymityNote}>
          Teams unter der Anonymisierungsschwelle wurden zusammengefasst.
        </Text>
      )}
      <PageFooter />
    </Page>
  )
}

function CsrdMappingPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>CSRD-Mapping</Text>
      <View style={styles.csrdHeaderRow}>
        <Text style={[styles.csrdHeaderCell, { width: '20%' }]}>Standard</Text>
        <Text style={[styles.csrdHeaderCell, { width: '35%' }]}>Beschreibung</Text>
        <Text style={[styles.csrdHeaderCell, { width: '25%' }]}>ELYO-Kennzahl</Text>
        <Text style={[styles.csrdHeaderCell, { width: '20%' }]}>Wert</Text>
      </View>
      {data.csrdMapping.map((entry, i) => (
        <View key={entry.standard} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#f9fafb' } : {}]}>
          <Text style={[styles.tableCell, { width: '20%' }]}>{entry.standard}</Text>
          <Text style={[styles.tableCell, { width: '35%' }]}>{entry.description}</Text>
          <Text style={[styles.tableCell, { width: '25%' }]}>{entry.elyoMetric}</Text>
          <Text style={[styles.tableCell, { width: '20%' }]}>{entry.value}</Text>
        </View>
      ))}
      <Text style={styles.methodNote}>
        Methodik: Anonymisierte Aggregation via ELYO Wellbeing Engine. Daten werden nicht an Dritte weitergegeben.
      </Text>
      <PageFooter />
    </Page>
  )
}

export default function EsgReportPdf({ data }: { data: ReportData }) {
  return (
    <Document>
      <CoverPage data={data} />
      <ExecutiveSummaryPage data={data} />
      <TrendAndTeamsPage data={data} />
      <CsrdMappingPage data={data} />
    </Document>
  )
}
