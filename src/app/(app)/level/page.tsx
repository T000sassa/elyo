'use client'

import { motion } from 'framer-motion'
import { LevelEmblem } from '@/components/level/LevelEmblem'
import { LevelBadge, type Level } from '@/components/ui/level-badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Check, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

const LEVEL_TIMELINE: {
  level: Level
  status: 'done' | 'current' | 'locked'
  privileges: { label: string; locked: boolean }[]
}[] = [
  {
    level: 'STARTER',
    status: 'done',
    privileges: [
      { label: 'Zugang zum ELYO-Portal',        locked: false },
      { label: 'Täglicher Check-in',             locked: false },
    ],
  },
  {
    level: 'BRONZE',
    status: 'done',
    privileges: [
      { label: 'Kostenlose Erstberatung Ernährung', locked: false },
      { label: 'Zugang zu ELYO-Webinaren',          locked: false },
    ],
  },
  {
    level: 'SILVER',
    status: 'current',
    privileges: [
      { label: '20% Rabatt bei Partner-Studios',      locked: false },
      { label: 'Bevorzugter Terminzugang (24h)',       locked: false },
      { label: 'Team-Challenge starten',               locked: false },
    ],
  },
  {
    level: 'GOLD',
    status: 'locked',
    privileges: [
      { label: '⚡ Fast Lane: Direkte Termine bei Top-Experten', locked: true },
      { label: 'Kostenlose Coaching-Session (1x/Quartal)',       locked: true },
      { label: 'Persönlicher Vitalitäts-Jahresbericht',         locked: true },
    ],
  },
  {
    level: 'PLATINUM',
    status: 'locked',
    privileges: [
      { label: 'Beta-Features frühzeitig testen', locked: true },
      { label: 'Ambassador-Status',               locked: true },
      { label: 'Versicherungsvorteile (in Entwicklung)', locked: true },
    ],
  },
]

const POINT_ACTIVITIES = [
  { icon: '🔥', label: 'Täglicher Check-in',         pts: '+2 Punkte' },
  { icon: '📊', label: 'Umfrage ausfüllen',           pts: '+5 Punkte' },
  { icon: '⌚', label: 'Wearable-Sync aktiv',         pts: '+1 Punkt/Tag' },
  { icon: '📋', label: 'Anamnese vervollständigen',   pts: 'bis zu +20 Punkte' },
  { icon: '⭐', label: 'Partner bewerten',            pts: '+3 Punkte' },
]

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

export default function LevelPage() {
  const [expanded, setExpanded] = useState<Level | null>('SILVER')

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={stagger.container}
      initial="hidden"
      animate="show"
    >
      {/* Level hero */}
      <motion.div
        variants={stagger.item}
        className="rounded-3xl p-8 text-center"
        style={{ background: 'linear-gradient(135deg, #f0fdf9 0%, #ffffff 60%)', border: '1px solid #d1fae5' }}
      >
        <div className="flex justify-center mb-4">
          <LevelEmblem level="SILVER" progress={72} size={160} />
        </div>
        <h1
          className="text-2xl font-semibold text-gray-900"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Sarah – Level SILVER
        </h1>
        <p className="text-sm text-gray-400 mt-1">Seit 47 Tagen dabei</p>

        <div className="mt-6 max-w-xs mx-auto">
          <ProgressBar
            value={72}
            label="Fortschritt zu GOLD"
            sublabel="72/100 Punkte"
            color="#f59e0b"
          />
        </div>

        {/* What's missing */}
        <div className="mt-5 grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {[
            { label: 'Streak 30+ Tage', progress: '14/30', done: false },
            { label: 'Wearable verbunden', progress: 'Erledigt', done: true },
            { label: 'Anamnese 100%', progress: '80%', done: false },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-2.5 text-center"
              style={{ background: item.done ? '#f0fdf9' : '#fffbeb', border: `1px solid ${item.done ? '#d1fae5' : '#fde68a'}` }}
            >
              <p className="text-[10px] font-medium text-gray-600 leading-tight">{item.label}</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: item.done ? '#14b8a6' : '#b45309' }}>
                {item.progress}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/profile"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl"
          style={{ background: '#fffbeb', color: '#b45309' }}
        >
          Anamnese vervollständigen → 28 Punkte erhalten
        </Link>
      </motion.div>

      {/* Level timeline */}
      <motion.div variants={stagger.item}>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Alle Level</h2>
        <div className="space-y-2">
          {LEVEL_TIMELINE.map(({ level, status, privileges }) => (
            <div
              key={level}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'white', border: `1px solid ${status === 'current' ? '#a7f3d0' : 'hsl(200, 15%, 88%)'}` }}
            >
              <button
                onClick={() => setExpanded(expanded === level ? null : level)}
                className="flex w-full items-center gap-3 px-4 py-3.5"
              >
                {/* Status icon */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: status === 'done' ? '#f0fdf9' : status === 'current' ? '#14b8a6' : '#f3f4f6',
                  }}
                >
                  {status === 'done'    && <Check className="w-3.5 h-3.5" style={{ color: '#14b8a6' }} />}
                  {status === 'current' && <span className="text-white text-xs font-bold">●</span>}
                  {status === 'locked'  && <Lock className="w-3 h-3 text-gray-300" />}
                </div>

                <LevelBadge level={level} size={status === 'current' ? 'md' : 'sm'} />
                {status === 'current' && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: '#f0fdf9', color: '#14b8a6' }}
                  >
                    Aktuell
                  </span>
                )}

                <div className="ml-auto">
                  {expanded === level
                    ? <ChevronUp className="w-4 h-4 text-gray-300" />
                    : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </div>
              </button>

              {expanded === level && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: 'hsl(200, 15%, 93%)' }}>
                  <div className="mt-3 space-y-2">
                    {privileges.map((p) => (
                      <div key={p.label} className="flex items-center gap-2.5 text-sm">
                        {p.locked
                          ? <Lock className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" />
                          : <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#14b8a6' }} />}
                        <span className={p.locked ? 'text-gray-400' : 'text-gray-700'}>
                          {p.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Activity log */}
      <motion.div variants={stagger.item} className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Wie du Punkte sammelst</h2>
        <div className="space-y-2.5">
          {POINT_ACTIVITIES.map((a) => (
            <div key={a.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{a.icon}</span>
                <span className="text-sm text-gray-700">{a.label}</span>
              </div>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{ background: '#f0fdf9', color: '#0d9488' }}
              >
                {a.pts}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
