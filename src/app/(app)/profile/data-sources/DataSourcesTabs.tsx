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
