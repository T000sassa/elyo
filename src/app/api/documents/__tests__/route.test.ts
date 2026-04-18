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

  it('returns 403 when role is not EMPLOYEE', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'COMPANY_ADMIN' } })
    const req = new Request('http://localhost/api/documents')
    const res = await GET(req)
    expect(res.status).toBe(403)
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
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request('http://localhost/api/documents/doc-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'doc-1' } })
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not EMPLOYEE', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'COMPANY_ADMIN' } })
    const req = new Request('http://localhost/api/documents/doc-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'doc-1' } })
    expect(res.status).toBe(403)
  })

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
