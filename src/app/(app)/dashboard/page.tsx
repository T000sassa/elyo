'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, MapPin, ClipboardList } from 'lucide-react'
import { ScoreGauge } from '@/components/ui/score-gauge'
import { MetricChip } from '@/components/ui/metric-chip'
import { ProgressBar } from '@/components/ui/progress-bar'
import { LevelBadge } from '@/components/ui/level-badge'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

const MOCK_SCORE_HISTORY = [
  { day: 'Mo', score: 68 },
  { day: 'Di', score: 71 },
  { day: 'Mi', score: 65 },
  { day: 'Do', score: 74 },
  { day: 'Fr', score: 70 },
  { day: 'Sa', score: 72 },
  { day: 'So', score: 72 },
]

const MOCK_PARTNERS = [
  { name: 'Physiozentrum München',   type: 'Physiotherapie', dist: '1.2 km', rating: 4.9 },
  { name: 'YogaFlow Studio',         type: 'Bewegung',       dist: '2.8 km', rating: 4.7 },
  { name: 'Ernährungsberatung Koch', type: 'Ernährung',      dist: '3.4 km', rating: 4.8 },
]

const MOCK_SURVEYS = [
  { title: 'Quartalsbefragung Q2 2026', minutes: 3 },
  { title: 'Ergonomie am Arbeitsplatz', minutes: 2 },
]

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } },
}

export default function EmployeeDashboardPage() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={stagger.container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={stagger.item} className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">Willkommen zurück</p>
          <h1
            className="text-3xl font-semibold text-gray-900 leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {greeting}, Sarah 👋
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xl">🔥</span>
            <span className="text-sm font-semibold text-gray-700">14 Tage Streak</span>
            <LevelBadge level="SILVER" size="sm" />
          </div>
        </div>
        <Link
          href="/checkin"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-glow"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          Check-in starten
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* Score hero */}
      <motion.div
        variants={stagger.item}
        className="rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6"
        style={{ background: 'linear-gradient(135deg, #f0fdf9 0%, #ffffff 60%)', border: '1px solid #d1fae5' }}
      >
        <ScoreGauge score={72} maxScore={100} size={180} />
        <div className="flex-1 space-y-4 w-full">
          <div>
            <p className="text-sm font-medium text-gray-400">Vitalitäts-Score</p>
            <p className="text-2xl font-semibold mt-0.5" style={{ color: '#14b8a6', fontFamily: "'Fraunces', Georgia, serif" }}>
              Gut
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricChip label="Energie"   value={7.2} unit="/10" color="#14b8a6" bg="#f0fdf9" />
            <MetricChip label="Stimmung"  value={6.8} unit="/10" color="#4c8448" bg="#f2f7f4" />
            <MetricChip label="Belastung" value={4.1} unit="/10" color="#f59e0b" bg="#fffbeb" />
          </div>
          {/* Mini line chart */}
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_SCORE_HISTORY}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0a1f1c', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
                  formatter={(v: number | undefined) => v !== undefined ? [`${v}`, 'Score'] : []}
                />
                <Line type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Level progress */}
      <motion.div
        variants={stagger.item}
        className="rounded-2xl p-5"
        style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LevelBadge level="SILVER" />
            <span className="text-sm font-semibold text-gray-700">Auf dem Weg zu Gold</span>
          </div>
          <span className="text-xs text-gray-400">65%</span>
        </div>
        <ProgressBar
          value={65}
          sublabel="Noch 35% bis GOLD"
          color="#f59e0b"
          milestones={[{ value: 100, label: 'Gold' }]}
        />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Kostenlose Erstberatung', locked: false },
            { label: '20% Rabatt Studios',      locked: false },
            { label: 'Bevorzugter Termin',      locked: false },
          ].map((p) => (
            <div
              key={p.label}
              className="flex items-start gap-2 p-2.5 rounded-xl text-xs"
              style={{ background: '#f0fdf9' }}
            >
              <span style={{ color: '#14b8a6' }}>✓</span>
              <span className="text-gray-600 leading-tight">{p.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl text-xs" style={{ background: '#fffbeb' }}>
          <span>🔒</span>
          <span className="text-gray-400">⚡ Fast Lane zu Experten — noch 35% bis GOLD</span>
        </div>
      </motion.div>

      {/* Partners carousel */}
      <motion.div variants={stagger.item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Partner in deiner Nähe</h2>
          <Link href="/partners" className="text-xs font-medium" style={{ color: '#14b8a6' }}>
            Alle anzeigen →
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {MOCK_PARTNERS.map((p) => (
            <div
              key={p.name}
              className="flex-shrink-0 w-52 rounded-2xl p-4 card-lift"
              style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}
            >
              <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style={{ background: '#f0fdf9' }}>
                <MapPin className="w-5 h-5" style={{ color: '#14b8a6' }} />
              </div>
              <p className="text-sm font-semibold text-gray-800 leading-tight mb-1">{p.name}</p>
              <p className="text-xs text-gray-400">{p.type} · {p.dist}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs font-semibold text-gray-700">⭐ {p.rating}</span>
                <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#f0fdf9', color: '#14b8a6' }}>
                  ELYO Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Open surveys */}
      <motion.div variants={stagger.item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            Offene Umfragen
          </h2>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ background: '#ef4444' }}
          >
            2
          </span>
        </div>
        <div className="space-y-2">
          {MOCK_SURVEYS.map((s) => (
            <div
              key={s.title}
              className="flex items-center justify-between p-4 rounded-2xl"
              style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">ca. {s.minutes} Minuten</p>
              </div>
              <button
                className="flex-shrink-0 text-sm font-semibold px-3 py-1.5 rounded-xl text-white"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                Jetzt ausfüllen
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
