'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PartnerCard, type Partner } from '@/components/partners/PartnerCard'
import { LevelBadge, type Level } from '@/components/ui/level-badge'

const CATEGORIES = ['Alle', 'Physiotherapie', 'Fitness', 'Mental Health', 'Ernährung', 'Schlaf', 'MSK']
type Tab = 'alle' | 'nahe' | 'digital' | 'vorteile'

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item:      { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

const LEVEL_ORDER: Level[] = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']

export function PartnersPageClient({ partners, currentLevel }: { partners: Partner[]; currentLevel: Level }) {
  const [tab, setTab] = useState<Tab>('alle')
  const [category, setCategory] = useState('Alle')

  const filtered = partners.filter((p) => {
    if (tab === 'nahe'    && p.distance === 'digital') return false
    if (tab === 'digital' && p.distance !== 'digital') return false
    if (tab === 'vorteile') {
      const unlocked = p.minLevel === 'all' || LEVEL_ORDER.indexOf(currentLevel) >= LEVEL_ORDER.indexOf(p.minLevel as Level)
      if (!unlocked) return false
    }
    if (category !== 'Alle' && p.type !== category) return false
    return true
  })

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Partner-Netzwerk
        </h1>
        <p className="text-sm text-gray-400 mt-1">Kuratierte Angebote für dein Wohlbefinden</p>
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #f0fdf9, #ffffff)', border: '1px solid #d1fae5' }}>
        <div className="flex items-center gap-2 mb-3">
          <LevelBadge level={currentLevel} />
          <span className="text-sm font-semibold text-gray-700">Dein aktuelles Level</span>
        </div>
      </div>

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

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={category === c ? { background: '#14b8a6', color: 'white' } : { background: '#f3f4f6', color: '#6b7280' }}
          >
            {c}
          </button>
        ))}
      </div>

      <motion.div
        className="space-y-3"
        variants={stagger.container}
        initial="hidden"
        animate="show"
        key={tab + category}
      >
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Bald mehr Partner in deiner Region.
          </div>
        ) : (
          filtered.map((p) => (
            <motion.div key={p.name} variants={stagger.item}>
              <PartnerCard partner={p} />
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  )
}
