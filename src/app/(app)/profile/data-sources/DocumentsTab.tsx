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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body?.error === 'file_too_large') {
          setError('Datei ist zu groß. Maximal 10 MB.')
        } else if (body?.error === 'invalid_file_type') {
          setError('Nur PDFs sind erlaubt.')
        } else {
          setToast('Upload fehlgeschlagen.')
        }
        return
      }
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
      <label
        htmlFor="doc-upload"
        className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center cursor-pointer hover:border-gray-400 transition-colors block"
      >
        <input
          id="doc-upload"
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
      </label>

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
