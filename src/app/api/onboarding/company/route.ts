import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { OnboardingSchema } from '@/lib/validations'
import { rateLimit, getClientIP } from '@/lib/ratelimit'

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base)
  let i = 0
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${++i}`
  }
  return slug
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req.headers)
  const { allowed, resetAt } = rateLimit(`onboarding:${ip}`, 3, 15 * 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) } },
    )
  }

  const body = await req.json()
  const parsed = OnboardingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const {
    companyName, industry, employeeRange, country,
    adminName, email, password,
    anonymityThreshold, checkinFrequency,
  } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'E-Mail bereits registriert.' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const slug = await uniqueSlug(companyName)

  const company = await prisma.company.create({
    data: {
      name: companyName,
      slug,
      industry: industry ?? null,
      employeeRange: employeeRange ?? null,
      country,
      anonymityThreshold,
      checkinFrequency,
      users: {
        create: {
          email,
          name: adminName,
          passwordHash,
          role: 'COMPANY_ADMIN',
        },
      },
    },
    select: { id: true },
  })

  return NextResponse.json({ success: true, companyId: company.id }, { status: 201 })
}
