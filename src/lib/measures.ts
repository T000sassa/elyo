export type TriggerType = 'high_stress' | 'low_energy' | 'low_participation'
export type MeasureCategory = 'workshop' | 'flexibility' | 'sport' | 'mental' | 'nutrition'

export interface MeasureTemplate {
  title: string
  category: MeasureCategory
  description: string
}

export const MEASURE_TEMPLATES: Record<TriggerType, MeasureTemplate[]> = {
  high_stress: [
    {
      title: 'Teamworkshop Stressmanagement',
      category: 'workshop',
      description: 'Gemeinsamer Workshop zu Stressbewältigungsstrategien für das Team (90 Min., intern oder extern moderiert).',
    },
    {
      title: 'Flexible Arbeitszeiten diese Woche',
      category: 'flexibility',
      description: 'Flexible Kernarbeitszeiten für eine Woche einführen, um individuelle Erholungsphasen zu ermöglichen.',
    },
    {
      title: 'Tägliches Stand-up verkürzen',
      category: 'flexibility',
      description: 'Stand-up auf max. 10 Minuten begrenzen und optionale Themen in separate Meetings auslagern.',
    },
    {
      title: 'Achtsamkeitspause einführen (10 Min.)',
      category: 'mental',
      description: 'Täglich eine geführte 10-Minuten-Achtsamkeitspause im Team-Kalender blocken.',
    },
    {
      title: 'Aufgabenverteilung im Team besprechen',
      category: 'workshop',
      description: 'Offene Runde zur Überprüfung aktueller Aufgabenlasten und Umverteilung wenn nötig.',
    },
  ],
  low_energy: [
    {
      title: 'Bewegungspause einführen (10 Min.)',
      category: 'sport',
      description: 'Täglich eine kurze Bewegungspause in den Team-Rhythmus integrieren – Spaziergang oder Dehnübungen.',
    },
    {
      title: 'Outdoor-Meeting vorschlagen',
      category: 'sport',
      description: 'Nächstes 1:1 oder kleines Team-Meeting als Walking-Meeting durchführen.',
    },
    {
      title: 'Gemeinsame Mittagspause aktivieren',
      category: 'nutrition',
      description: 'Gemeinsame Mittagspause (mind. 30 Min., bildschirmfrei) im Team-Kalender etablieren.',
    },
    {
      title: 'Ergonomie-Check am Arbeitsplatz',
      category: 'flexibility',
      description: 'Kurzcheck: Stehpulte, Beleuchtung und Sitzhaltung im Team besprechen und optimieren.',
    },
    {
      title: 'Vitalitäts-Challenge starten',
      category: 'sport',
      description: 'Zweiwöchige Team-Challenge: tägliche Schrittanzahl oder gemeinsame Sporteinheit.',
    },
  ],
  low_participation: [
    {
      title: 'Check-in-Reminder-Kampagne starten',
      category: 'workshop',
      description: 'Gezielte Kommunikation im Team zum Nutzen und zur Vertraulichkeit des täglichen Check-ins.',
    },
    {
      title: 'Team-Challenge aktivieren',
      category: 'sport',
      description: 'Gamification-Element nutzen: Team gegen Team in wöchentlicher Vitalitäts-Challenge.',
    },
    {
      title: 'Anonymitätsversprechen kommunizieren',
      category: 'workshop',
      description: 'Transparenter Hinweis an alle Mitarbeiter: Kein Arbeitgeber sieht individuelle Check-in-Daten.',
    },
    {
      title: 'Check-in in Team-Meeting integrieren',
      category: 'flexibility',
      description: '2-Minuten-Check-in am Anfang des wöchentlichen Team-Meetings etablieren.',
    },
  ],
}

export function pickTemplate(trigger: TriggerType): MeasureTemplate {
  const templates = MEASURE_TEMPLATES[trigger]
  return templates[Math.floor(Math.random() * templates.length)]
}
