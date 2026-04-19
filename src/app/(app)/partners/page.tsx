import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Partner as UiPartner } from '@/components/partners/PartnerCard'
import { PartnersPageClient } from './PartnersPageClient'

const CATEGORY_LABELS: Record<string, string> = {
  physiotherapy: 'Physiotherapie',
  fitness:       'Fitness',
  mental:        'Mental Health',
  nutrition:     'Ernährung',
  sleep:         'Schlaf',
  msk:           'MSK',
  prevention:    'Präventivmedizin',
  movement:      'Bewegung',
}

function toUiPartner(p: {
  name: string
  type: string
  categories: string[]
  city: string | null
  minimumLevel: string
  verificationStatus: string
}, currentLevel: UiPartner['currentLevel']): UiPartner {
  const cat = p.categories[0]
  return {
    name:         p.name,
    type:         cat ? (CATEGORY_LABELS[cat] ?? cat) : '',
    distance:     p.type === 'DIGITAL' ? 'digital' : (p.city ?? 'vor Ort'),
    verified:     p.verificationStatus === 'VERIFIED',
    minLevel:     (p.minimumLevel === 'STARTER' ? 'all' : p.minimumLevel) as UiPartner['minLevel'],
    currentLevel,
  }
}

export default async function PartnersPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'EMPLOYEE') redirect('/dashboard')

  const userPoints = await prisma.userPoints.findUnique({ where: { userId: session.user.id } })
  const currentLevel = (userPoints?.level ?? 'STARTER') as UiPartner['currentLevel']

  const dbPartners = await prisma.partner.findMany({
    where: { verificationStatus: 'VERIFIED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, name: true, type: true, categories: true,
      city: true, minimumLevel: true, verificationStatus: true,
    },
  })

  const partners = dbPartners.map((p) => toUiPartner(p, currentLevel))

  return <PartnersPageClient partners={partners} currentLevel={currentLevel} />
}
