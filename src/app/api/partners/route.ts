import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const category = sp.get('category')
  const type = sp.get('type')
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const radiusKm = sp.get('radiusKm')
  const take = 20
  const cursor = sp.get('cursor')

  const where: Record<string, unknown> = { verificationStatus: 'VERIFIED' }
  if (category) where.categories = { has: category }
  if (type && ['LOCAL', 'EXPERT', 'DIGITAL'].includes(type)) where.type = type

  let partners = await prisma.partner.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true, name: true, type: true, categories: true, description: true,
      city: true, lat: true, lng: true, website: true, phone: true,
      minimumLevel: true, verificationStatus: true,
    },
  })

  if (lat && lng && radiusKm) {
    const la = parseFloat(lat), ln = parseFloat(lng), rk = parseFloat(radiusKm)
    if (!Number.isNaN(la) && !Number.isNaN(ln) && !Number.isNaN(rk)) {
      partners = partners
        .filter((p) => p.lat !== null && p.lng !== null && haversineKm(la, ln, p.lat, p.lng) <= rk)
        .sort((a, b) => {
          const da = haversineKm(la, ln, a.lat!, a.lng!)
          const db = haversineKm(la, ln, b.lat!, b.lng!)
          return da - db
        })
    }
  }

  const nextCursor = partners.length > take ? partners[take - 1].id : null
  return NextResponse.json({ partners: partners.slice(0, take), nextCursor })
}
