'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PartnerCard, type Partner } from '@/components/partners/PartnerCard'
import { LevelBadge } from '@/components/ui/level-badge'

const CURRENT_LEVEL = 'SILVER' as const

const MOCK_PARTNERS: Partner[] = [
  { name: 'Physiozentrum München Ost', type: 'Physiotherapie',  distance: '1.2 km',  rating: 4.9, verified: true,  minLevel: 'all',    currentLevel: CURRENT_LEVEL, goldSlots: true  },
  { name: 'YogaFlow Studio',           type: 'Bewegung',        distance: '2.8 km',  rating: 4.7, verified: true,  minLevel: 'all',    currentLevel: CURRENT_LEVEL                   },
  { name: 'Dr. med. Anna Berger',      type: 'Präventivmedizin',distance: '0.8 km',  rating: 5.0, verified: true,  minLevel: 'GOLD',   currentLevel: CURRENT_LEVEL, fastLane: true    },
  { name: 'MindfulNess Online',        type: 'Mental Health',   distance: 'digital', rating: 4.6, verified: true,  minLevel: 'SILVER', currentLevel: CURRENT_LEVEL                   },
  { name: 'Ernährungsberatung Koch',   type: 'Ernährung',       distance: '3.4 km',  rating: 4.8, verified: true,  minLevel: 'BRONZE', currentLevel: CURRENT_LEVEL                   },
  { name: 'FitnessFabrik',             type: 'Fitness',         distance: '1.9 km',  rating: 4.5, verified: true,  minLevel: 'SILVER', currentLevel: CURRENT_LEVEL                   },
  { name: 'Rücken-Coach Online',       type: 'MSK',             distance: 'digital', rating: 4.7, verified: true,  minLevel: 'all',    currentLevel: CURRENT_LEVEL                   },
  { name: 'Schlafcoaching Müller',     type: 'Schlaf',          distance: 'digital', rating: 4.6, verified: false, minLevel: 'all',    currentLevel: CURRENT_LEVEL, pending: true     },
]

const CATEGORIES = ['Alle', 'Physiotherapie', 'Fitness', 'Mental Health', 'Ernährung', 'Schlaf', 'MSK']
type Tab = 'alle' | 'nahe' | 'digital' | 'vorteile'

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

export default function PartnersPage() {
  const [tab, setTab]         = useState<Tab>('alle')
  const [category, setCategory] = useState('Alle')

  const filtered = MOCK_PARTNERS.filter((p) => {
    if (tab === 'nahe'    && p.distance === 'digital') return false
    if (tab === 'digital' && p.distance !== 'digital') return false
    if (tab === 'vorteile') {
      const order = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']
      const unlocked = p.minLevel === 'all' || order.indexOf(CURRENT_LEVEL) >= order.indexOf(p.minLevel)
      if (!unlocked) return false
    }
    if (category !== 'Alle' && p.type !== category) return false
    return true
  })

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Partner-Netzwerk
        </h1>
        <p className="text-sm text-gray-400 mt-1">Kuratierte Angebote für dein Wohlbefinden</p>
      </div>

      {/* Hero — level benefits */}
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #f0fdf9, #ffffff)', border: '1px solid #d1fae5' }}>
        <div className="flex items-center gap-2 mb-3">
          <LevelBadge level="SILVER" />
          <span className="text-sm font-semibold text-gray-700">3 Vorteile für dein Level verfügbar</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Erstberatung Ernährung', sublabel: 'Kostenlos' },
            { label: '20% Rabatt Studios',     sublabel: 'Bei 3 Partnern' },
            { label: 'Bevorzugter Termin',     sublabel: '24h statt 48h' },
          ].map((v) => (
            <div key={v.label} className="rounded-xl p-2.5" style={{ background: 'white', border: '1px solid #d1fae5' }}>
              <p className="text-xs font-semibold text-gray-700 leading-tight">{v.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{v.sublabel}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
        {(['alle', 'nahe', 'digital', 'vorteile'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={tab === t ? { background: 'white', color: '#14b8a6', boxShadow: '0 1px 3px rgb(0,0,0,0.07)' } : { color: '#6b7280' }}
          >
            {t === 'alle' ? 'Alle' : t === 'nahe' ? 'In der Nähe' : t === 'digital' ? 'Digital' : 'Meine Vorteile'}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={category === c
              ? { background: '#14b8a6', color: 'white' }
              : { background: '#f3f4f6', color: '#6b7280' }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Partner list */}
      <motion.div
        className="space-y-3"
        variants={stagger.container}
        initial="hidden"
        animate="show"
        key={tab + category}
      >
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Keine Partner gefunden.</div>
        ) : (
          filtered.map((p) => (
            <motion.div key={p.name} variants={stagger.item}>
              <PartnerCard partner={p} />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Static map placeholder */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid hsl(200, 15%, 88%)', height: 200, background: '#f0fdf9', position: 'relative' }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
          <span className="text-3xl">🗺️</span>
          <p className="text-sm font-medium">Interaktive Karte (Phase 2)</p>
          <p className="text-xs">8 Partner in München Ost</p>
        </div>
      </div>
    </div>
  )
}
