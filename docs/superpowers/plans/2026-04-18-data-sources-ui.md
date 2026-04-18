# Data Sources UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/profile/data-sources` page with tab navigation (Verbunden / Verfügbar / Dokumente), Google Health connection management, and PDF document upload/delete via Vercel Blob.

**Architecture:** Server Component page fetches `WearableConnection` and `UserDocument[]` from Prisma, passes data as props to a `DataSourcesTabs` Client Component that manages `?tab=` URL state. Mutations (sync, disconnect, upload, delete) call dedicated API routes and trigger `router.refresh()` to re-render with fresh server data.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma/PostgreSQL, `@vercel/blob`, Framer Motion, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add `@vercel/blob` dependency |
| `prisma/schema.prisma` | Modify | Add `UserDocument` model + User relation |
| `prisma/migrations/20260418010000_add_user_documents/migration.sql` | Create | SQL DDL for user_documents table |
| `src/app/api/documents/route.ts` | Create | POST upload + GET list |
| `src/app/api/documents/[id]/route.ts` | Create | DELETE document |
| `src/app/api/documents/__tests__/route.test.ts` | Create | Unit tests for document routes |
| `src/app/(app)/profile/data-sources/page.tsx` | Create | Server Component — data fetching |
| `src/app/(app)/profile/data-sources/DataSourcesTabs.tsx` | Create | Client Component — tab state + points banner |
| `src/app/(app)/profile/data-sources/ConnectedTab.tsx` | Create | Connected sources (Google Fit status + actions) |
| `src/app/(app)/profile/data-sources/AvailableTab.tsx` | Create | Available sources grid (static) |
| `src/app/(app)/profile/data-sources/DocumentsTab.tsx` | Create | PDF upload dropzone + document list |

---

## Task 1: Install @vercel/blob + Prisma UserDocument Model

**Files:**
- Modify: `package.json`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260418010000_add_user_documents/migration.sql`

- [ ] **Step 1: Install @vercel/blob**

```bash
npm install @vercel/blob
```

Expected: `@vercel/blob` appears in `package.json` dependencies.

- [ ] **Step 2: Add UserDocument model to prisma/schema.prisma**

Add the following model after the `WearableSync` model (around line 290+):

```prisma
model UserDocument {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fileName   String
  blobUrl    String
  blobKey    String
  mimeType   String
  size       Int
  uploadedAt DateTime @default(now())

  @@index([userId])
  @@map("user_documents")
}
```

Add `documents UserDocument[]` to the `User` model relations (after `wearableSyncs`):

```prisma
  wearableSyncs       WearableSync[]
  documents           UserDocument[]
```

- [ ] **Step 3: Create migration SQL**

Create file `prisma/migrations/20260418010000_add_user_documents/migration.sql`:

```sql
CREATE TABLE "user_documents" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "fileName"   TEXT NOT NULL,
  "blobUrl"    TEXT NOT NULL,
  "blobKey"    TEXT NOT NULL,
  "mimeType"   TEXT NOT NULL,
  "size"       INTEGER NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_documents_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "user_documents_userId_idx" ON "user_documents"("userId");
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: Output ends with `✔ Generated Prisma Client`. No TypeScript errors on `prisma.userDocument`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma prisma/migrations/20260418010000_add_user_documents/migration.sql
git commit -m "feat: add UserDocument model + @vercel/blob dependency"
```

---

## Task 2: Document API Routes

**Files:**
- Create: `src/app/api/documents/route.ts`
- Create: `src/app/api/documents/[id]/route.ts`
- Create: `src/app/api/documents/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/api/documents/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockPrismaCreate = vi.fn()
const mockPrismaFindMany = vi.fn()
const mockPrismaFindUnique = vi.fn()
const mockPrismaDelete = vi.fn()
const mockBlobPut = vi.fn()
const mockBlobDel = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userDocument: {
      create: mockPrismaCreate,
      findMany: mockPrismaFindMany,
      findUnique: mockPrismaFindUnique,
      delete: mockPrismaDelete,
    },
  },
}))
vi.mock('@vercel/blob', () => ({
  put: mockBlobPut,
  del: mockBlobDel,
}))

// Import after mocks
const { POST, GET } = await import('../route')
const { DELETE } = await import('../[id]/route')

const mockSession = { user: { id: 'user-1', role: 'EMPLOYEE' } }

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockSession)
})

describe('POST /api/documents', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const formData = new FormData()
    formData.append('file', new File(['content'], 'test.pdf', { type: 'application/pdf' }))
    const req = new Request('http://localhost/api/documents', { method: 'POST', body: formData })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not EMPLOYEE', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'COMPANY_ADMIN' } })
    const formData = new FormData()
    formData.append('file', new File(['content'], 'test.pdf', { type: 'application/pdf' }))
    const req = new Request('http://localhost/api/documents', { method: 'POST', body: formData })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 for non-PDF file', async () => {
    const formData = new FormData()
    formData.append('file', new File(['content'], 'test.txt', { type: 'text/plain' }))
    const req = new Request('http://localhost/api/documents', { method: 'POST', body: formData })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_file_type')
  })

  it('returns 400 for file exceeding 10MB', async () => {
    const bigContent = new Uint8Array(11 * 1024 * 1024)
    const formData = new FormData()
    formData.append('file', new File([bigContent], 'big.pdf', { type: 'application/pdf' }))
    const req = new Request('http://localhost/api/documents', { method: 'POST', body: formData })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('file_too_large')
  })

  it('uploads file and creates UserDocument record', async () => {
    const blobResult = { url: 'https://blob.vercel.com/test.pdf', pathname: 'test.pdf' }
    mockBlobPut.mockResolvedValue(blobResult)
    const docRecord = { id: 'doc-1', userId: 'user-1', fileName: 'test.pdf', blobUrl: blobResult.url, blobKey: blobResult.pathname, mimeType: 'application/pdf', size: 100, uploadedAt: new Date() }
    mockPrismaCreate.mockResolvedValue(docRecord)

    const formData = new FormData()
    formData.append('file', new File(['content'], 'test.pdf', { type: 'application/pdf' }))
    const req = new Request('http://localhost/api/documents', { method: 'POST', body: formData })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockBlobPut).toHaveBeenCalledOnce()
    expect(mockPrismaCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'user-1', blobUrl: blobResult.url }),
    }))
    const body = await res.json()
    expect(body.data.id).toBe('doc-1')
  })
})

describe('GET /api/documents', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request('http://localhost/api/documents')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns documents for authenticated user', async () => {
    const docs = [{ id: 'doc-1', fileName: 'report.pdf', size: 1000, uploadedAt: new Date() }]
    mockPrismaFindMany.mockResolvedValue(docs)
    const req = new Request('http://localhost/api/documents')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe('DELETE /api/documents/[id]', () => {
  it('returns 404 when document not found', async () => {
    mockPrismaFindUnique.mockResolvedValue(null)
    const req = new Request('http://localhost/api/documents/doc-99', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'doc-99' } })
    expect(res.status).toBe(404)
  })

  it('returns 404 when document belongs to different user', async () => {
    mockPrismaFindUnique.mockResolvedValue({ id: 'doc-1', userId: 'other-user', blobKey: 'key' })
    const req = new Request('http://localhost/api/documents/doc-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'doc-1' } })
    expect(res.status).toBe(404)
  })

  it('deletes blob and DB record', async () => {
    mockPrismaFindUnique.mockResolvedValue({ id: 'doc-1', userId: 'user-1', blobKey: 'pathname/test.pdf' })
    mockBlobDel.mockResolvedValue(undefined)
    mockPrismaDelete.mockResolvedValue({})
    const req = new Request('http://localhost/api/documents/doc-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'doc-1' } })
    expect(res.status).toBe(204)
    expect(mockBlobDel).toHaveBeenCalledWith('pathname/test.pdf')
    expect(mockPrismaDelete).toHaveBeenCalledWith({ where: { id: 'doc-1' } })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/app/api/documents/__tests__/route.test.ts
```

Expected: FAIL — modules not found yet.

- [ ] **Step 3: Create POST + GET route**

Create `src/app/api/documents/route.ts`:

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 })

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
  }

  const blob = await put(file.name, file, { access: 'public' })

  const doc = await prisma.userDocument.create({
    data: {
      userId: session.user.id,
      fileName: file.name,
      blobUrl: blob.url,
      blobKey: blob.pathname,
      mimeType: file.type,
      size: file.size,
    },
  })

  return NextResponse.json({ data: doc })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const docs = await prisma.userDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json({ data: docs })
}
```

- [ ] **Step 4: Create DELETE route**

Create `src/app/api/documents/[id]/route.ts`:

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = params
  const doc = await prisma.userDocument.findUnique({ where: { id } })

  if (!doc || doc.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  await del(doc.blobKey)
  await prisma.userDocument.delete({ where: { id } })

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/app/api/documents/__tests__/route.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/documents/
git commit -m "feat: add document upload/list/delete API routes"
```

---

## Task 3: Server Component Page

**Files:**
- Create: `src/app/(app)/profile/data-sources/page.tsx`

- [ ] **Step 1: Create Server Component page**

Create `src/app/(app)/profile/data-sources/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DataSourcesTabs } from './DataSourcesTabs'

export default async function DataSourcesPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'EMPLOYEE') redirect('/dashboard')

  const [connection, documents] = await Promise.all([
    prisma.wearableConnection.findUnique({
      where: { userId_source: { userId: session.user.id, source: 'google_health' } },
    }),
    prisma.userDocument.findMany({
      where: { userId: session.user.id },
      orderBy: { uploadedAt: 'desc' },
    }),
  ])

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1
        className="text-xl font-semibold text-gray-900 mb-1"
        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
      >
        Deine Datenquellen
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        Alle Daten gehören dir. Dein Arbeitgeber sieht diese nicht.
      </p>
      <DataSourcesTabs connection={connection} documents={documents} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors on the new file (DataSourcesTabs not yet created → will show module error, that's fine for now — suppress by checking only after Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/profile/data-sources/page.tsx
git commit -m "feat: add data-sources Server Component page"
```

---

## Task 4: DataSourcesTabs + ConnectedTab

**Files:**
- Create: `src/app/(app)/profile/data-sources/DataSourcesTabs.tsx`
- Create: `src/app/(app)/profile/data-sources/ConnectedTab.tsx`

- [ ] **Step 1: Create DataSourcesTabs**

Create `src/app/(app)/profile/data-sources/DataSourcesTabs.tsx`:

```typescript
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { WearableConnection, UserDocument } from '@prisma/client'
import { ConnectedTab } from './ConnectedTab'
import { AvailableTab } from './AvailableTab'
import { DocumentsTab } from './DocumentsTab'

type Tab = 'connected' | 'available' | 'documents'

const TABS: { id: Tab; label: string }[] = [
  { id: 'connected', label: 'Verbunden' },
  { id: 'available', label: 'Verfügbar' },
  { id: 'documents', label: 'Dokumente' },
]

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

interface Props {
  connection: WearableConnection | null
  documents: UserDocument[]
}

export function DataSourcesTabs({ connection, documents }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = (searchParams.get('tab') as Tab | null) ?? 'connected'

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const isConnected = connection?.isActive === true

  return (
    <div>
      {/* Tab Pills */}
      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={
              activeTab === t.id
                ? { background: '#1B4D3E', color: 'white' }
                : { background: 'white', border: '1px solid #e5e7eb', color: '#6b7280' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Points Banner — only when no active connection */}
      {!isConnected && (
        <div
          className="rounded-xl px-4 py-3 mb-4 text-sm text-white text-center"
          style={{ background: 'linear-gradient(135deg, #1B4D3E, #2d6b55)' }}
        >
          ⭐ Verbinde eine Quelle → <strong>+10 Punkte</strong> · Tägliche Sync → <strong>+1 Punkt/Tag</strong>
        </div>
      )}

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'connected' && (
          <motion.div key="connected" variants={tabVariants} initial="initial" animate="animate" exit="exit">
            <ConnectedTab connection={connection} />
          </motion.div>
        )}
        {activeTab === 'available' && (
          <motion.div key="available" variants={tabVariants} initial="initial" animate="animate" exit="exit">
            <AvailableTab isGoogleConnected={isConnected} />
          </motion.div>
        )}
        {activeTab === 'documents' && (
          <motion.div key="documents" variants={tabVariants} initial="initial" animate="animate" exit="exit">
            <DocumentsTab documents={documents} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Create ConnectedTab**

Create `src/app/(app)/profile/data-sources/ConnectedTab.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { WearableConnection } from '@prisma/client'

interface Props {
  connection: WearableConnection | null
}

export function ConnectedTab({ connection }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [toast, setToast] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      setToast('Verbindung fehlgeschlagen. Bitte erneut versuchen.')
    }
  }, [searchParams])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/wearables/google/sync', { method: 'POST' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setToast('Sync fehlgeschlagen, bitte erneut versuchen.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/wearables/google/disconnect', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setToast('Trennen fehlgeschlagen.')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex justify-between items-center">
          {toast}
          <button onClick={() => setToast(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {connection?.isActive ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: '#4285F4' }}
          >
            G
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900">Google Fit</div>
            <div className="text-xs text-gray-500">
              Verbunden seit {new Date(connection.connectedAt).toLocaleDateString('de-DE')}
            </div>
          </div>
          <div className="text-xs text-emerald-600 font-medium flex-shrink-0">✓ Aktiv</div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center space-y-3">
          <p className="text-sm text-gray-500">Noch keine Quelle verbunden.</p>
          <a
            href="/api/wearables/google/connect"
            className="inline-block rounded-full px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#1B4D3E' }}
          >
            Google Fit verbinden
          </a>
        </div>
      )}

      {connection?.isActive && (
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 rounded-full border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : '🔄 Jetzt synchronisieren'}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {disconnecting ? '…' : 'Trennen'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles (AvailableTab + DocumentsTab missing — skip for now)**

```bash
npx tsc --noEmit 2>&1 | grep -v "Cannot find module './AvailableTab'\|Cannot find module './DocumentsTab'"
```

Expected: No other TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/profile/data-sources/DataSourcesTabs.tsx src/app/(app)/profile/data-sources/ConnectedTab.tsx
git commit -m "feat: add DataSourcesTabs and ConnectedTab components"
```

---

## Task 5: AvailableTab + DocumentsTab

**Files:**
- Create: `src/app/(app)/profile/data-sources/AvailableTab.tsx`
- Create: `src/app/(app)/profile/data-sources/DocumentsTab.tsx`

- [ ] **Step 1: Create AvailableTab**

Create `src/app/(app)/profile/data-sources/AvailableTab.tsx`:

```typescript
'use client'

interface Props {
  isGoogleConnected: boolean
}

const SOURCES = [
  { id: 'google', name: 'Google Fit', icon: 'G', iconBg: '#4285F4', available: true },
  { id: 'apple', name: 'Apple Health', icon: '🍎', iconBg: '#e5e7eb', available: false },
  { id: 'oura', name: 'Oura Ring', icon: '💍', iconBg: '#e5e7eb', available: false },
  { id: 'garmin', name: 'Garmin', icon: '⌚', iconBg: '#e5e7eb', available: false },
]

export function AvailableTab({ isGoogleConnected }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SOURCES.map(source => (
        <div
          key={source.id}
          className="rounded-xl border border-gray-200 p-4 text-center space-y-2"
          style={source.available ? {} : { opacity: 0.5 }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mx-auto text-sm font-bold"
            style={{ background: source.iconBg, color: source.id === 'google' ? 'white' : undefined }}
          >
            {source.icon}
          </div>
          <div className="text-sm font-medium text-gray-800">{source.name}</div>
          {source.id === 'google' ? (
            isGoogleConnected ? (
              <span className="inline-block text-xs font-medium text-emerald-600">✓ Verbunden</span>
            ) : (
              <a
                href="/api/wearables/google/connect"
                className="inline-block text-xs font-semibold text-white px-3 py-1 rounded-full transition-opacity hover:opacity-90"
                style={{ background: '#1B4D3E' }}
              >
                Verbinden
              </a>
            )
          ) : (
            <span className="inline-block text-xs text-gray-400">Bald</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create DocumentsTab**

Create `src/app/(app)/profile/data-sources/DocumentsTab.tsx`:

```typescript
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserDocument } from '@prisma/client'

interface Props {
  documents: UserDocument[]
}

const MAX_SIZE = 10 * 1024 * 1024

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsTab({ documents }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (file.type !== 'application/pdf') {
      setError('Nur PDFs sind erlaubt.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Datei ist zu groß. Maximal 10 MB.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setToast('Upload fehlgeschlagen.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setToast('Löschen fehlgeschlagen.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex justify-between items-center">
          {toast}
          <button onClick={() => setToast(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Dropzone */}
      <div
        className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="text-2xl mb-2">📎</div>
        <p className="text-sm font-medium text-gray-700">
          {uploading ? 'Wird hochgeladen…' : 'PDF hochladen'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Max. 10 MB</p>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Noch keine Dokumente hochgeladen.</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3"
            >
              <span className="text-lg flex-shrink-0">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                <p className="text-xs text-gray-400">
                  {formatBytes(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('de-DE')}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 flex-shrink-0"
              >
                {deletingId === doc.id ? '…' : 'Löschen'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/profile/data-sources/AvailableTab.tsx src/app/(app)/profile/data-sources/DocumentsTab.tsx
git commit -m "feat: add AvailableTab and DocumentsTab components"
```

---

## Task 6: Run All Tests + TypeScript Check

**Files:**
- No new files — verification only

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass, including:
- `src/lib/__tests__/crypto.test.ts` (8 tests)
- `src/lib/__tests__/googleHealth.test.ts` (12 tests)
- `src/app/api/documents/__tests__/route.test.ts` (8 tests)

- [ ] **Step 2: TypeScript full check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit if any minor fixes needed**

```bash
git add -p
git commit -m "fix: resolve TypeScript issues in data-sources UI"
```

- [ ] **Step 4: Final commit with summary**

```bash
git add .
git commit -m "feat: complete Phase 2.3 data-sources UI with document management"
```
