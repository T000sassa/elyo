import type { PrismaClient } from '@prisma/client'
import { hashPartnerPassword } from './password'

const SEED_PARTNERS = [
  { email: 'physio-muenchen@seed.elyo.de', name: 'Physiozentrum München Ost', type: 'LOCAL',  categories: ['physiotherapy'], description: 'Moderne Physiotherapie-Praxis in München Ost mit Schwerpunkt auf aktiver Rehabilitation und manueller Therapie.', city: 'München', minimumLevel: 'STARTER' },
  { email: 'yogaflow@seed.elyo.de',          name: 'YogaFlow Studio',          type: 'LOCAL',  categories: ['movement', 'fitness'], description: 'Studio für Vinyasa-, Yin- und Hatha-Yoga. Ideal für Einsteiger und Fortgeschrittene, verschiedene Kurszeiten.', city: 'München', minimumLevel: 'STARTER' },
  { email: 'dr-berger@seed.elyo.de',         name: 'Dr. med. Anna Berger',     type: 'EXPERT', categories: ['prevention'], description: 'Fachärztin für Präventivmedizin. Individuelle Check-ups und Gesundheitsberatung, Schwerpunkt Stress-Resilienz.', city: 'München', minimumLevel: 'GOLD' },
  { email: 'mindfulness@seed.elyo.de',       name: 'MindfulNess Online',       type: 'DIGITAL',categories: ['mental'],   description: 'Online-Programme für Achtsamkeit, Meditation und Stressreduktion. Wöchentliche Live-Sessions und geführte Übungen.', city: null,      minimumLevel: 'SILVER' },
  { email: 'ernaehrung-koch@seed.elyo.de',   name: 'Ernährungsberatung Koch',  type: 'EXPERT', categories: ['nutrition'],description: 'Zertifizierte Ernährungsberatung nach DGE-Standard. Individuelle Beratung zu ausgewogener Ernährung, inkl. Blutwert-Analyse auf Wunsch.', city: 'München', minimumLevel: 'BRONZE' },
  { email: 'fitnessfabrik@seed.elyo.de',     name: 'FitnessFabrik',            type: 'LOCAL',  categories: ['fitness'],  description: 'Voll ausgestattetes Fitnessstudio mit Group Fitness, Personal Training und Sauna. 7 Tage die Woche geöffnet.', city: 'München', minimumLevel: 'SILVER' },
  { email: 'ruecken-coach@seed.elyo.de',     name: 'Rücken-Coach Online',      type: 'DIGITAL',categories: ['msk'],      description: 'App-basiertes Rücken-Trainingsprogramm mit individuell angepassten Übungen. Begleitend Video-Coaching.', city: null,      minimumLevel: 'STARTER' },
  { email: 'schlaf-mueller@seed.elyo.de',    name: 'Schlafcoaching Müller',    type: 'DIGITAL',categories: ['sleep'],    description: 'Coaching-Programm zur Optimierung der Schlafqualität. Digitale Schlafbegleitung mit wissenschaftlich fundierten Methoden.', city: null,      minimumLevel: 'STARTER' },
] as const

export async function seedPartners(prisma: PrismaClient): Promise<void> {
  const placeholderHash = await hashPartnerPassword('seed-reset-required-' + Math.random().toString(36).slice(2))
  for (const p of SEED_PARTNERS) {
    await prisma.partner.upsert({
      where:  { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: placeholderHash,
        name: p.name,
        type: p.type,
        categories: [...p.categories],
        description: p.description,
        city: p.city,
        minimumLevel: p.minimumLevel,
        verificationStatus: 'VERIFIED',
      },
    })
  }
}
