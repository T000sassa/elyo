import { Document, Page } from '@react-pdf/renderer'
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

export default function EsgReportPdf({ data: _data }: { data: ReportData }) {
  return <Document><Page size="A4" /></Document>
}
