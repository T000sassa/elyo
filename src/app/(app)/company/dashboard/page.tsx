'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Download, TrendingDown, TrendingUp, ClipboardList, UserPlus, BarChart2 } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

const TREND_DATA = [
  { week: 'KW1',  vi: 68 }, { week: 'KW2',  vi: 70 }, { week: 'KW3',  vi: 69 },
  { week: 'KW4',  vi: 71 }, { week: 'KW5',  vi: 72 }, { week: 'KW6',  vi: 70 },
  { week: 'KW7',  vi: 73 }, { week: 'KW8',  vi: 72 }, { week: 'KW9',  vi: 74 },
  { week: 'KW10', vi: 71 }, { week: 'KW11', vi: 73 }, { week: 'KW12', vi: 71 },
]

const TEAMS = [
  { name: 'Marketing',        members: 18, active: 16, vi: 76, trend: 'up'      },
  { name: 'IT / Entwicklung', members: 12, active: 9,  vi: 62, trend: 'neutral' },
  { name: 'Vertrieb',         members: 34, active: 28, vi: 74, trend: 'up'      },
  { name: 'Produktion – H3',  members: 34, active: 25, vi: 48, trend: 'up'      },
  { name: 'HR & Verwaltung',  members: 8,  active: 8,  vi: 81, trend: 'up'      },
  { name: 'Logistik',         members: 22, active: 17, vi: 70, trend: 'neutral' },
]

const AT_RISK = [
  { name: 'Produktion – Halle 3', belastung: 8.2, members: 34, trend: '↑' },
  { name: 'IT / Entwicklung',     belastung: 7.8, members: 12, trend: '→' },
]

function viColor(vi: number) {
  if (vi >= 70) return '#14b8a6'
  if (vi >= 55) return '#f59e0b'
  return '#ef4444'
}

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } } },
}

export default function CompanyDashboardPage() {
  return (
    <motion.div className="space-y-6 pb-8" variants={stagger.container} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={stagger.item} className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Unternehmensportal</p>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Müller Maschinenbau GmbH
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">347 Mitarbeiter · Letzter ESG-Export: vor 3 Tagen</p>
        </div>
        <button
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
          style={{ background: '#f0fdf9', color: '#0d9488', border: '1px solid #d1fae5' }}
        >
          <Download className="w-4 h-4" />
          ESG-Export
        </button>
      </motion.div>

      {/* KPI tiles */}
      <motion.div variants={stagger.item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Vitalitäts-Index', value: '71', unit: '/100', trend: '+3 vs. Vormonat', color: '#14b8a6', bg: '#f0fdf9', trendUp: true  },
          { label: 'Aktive Nutzer',    value: '218', unit: '/347', trend: '63% Aktivierungsrate', color: '#4c8448', bg: '#f2f7f4', trendUp: true  },
          { label: 'Ø Energie',        value: '6.8', unit: '/10',  trend: 'Diese Woche',  color: '#f59e0b', bg: '#fffbeb', trendUp: null },
          { label: 'Krankheitstage',   value: '24',  unit: '/Mo',  trend: '↓8% vs. Vormonat', color: '#14b8a6', bg: '#f0fdf9', trendUp: true  },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl p-4" style={{ background: kpi.bg }}>
            <p className="text-xs font-medium text-gray-400 mb-1">{kpi.label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: kpi.color, fontFamily: "'Fraunces', Georgia, serif" }}>
                {kpi.value}
              </span>
              <span className="text-xs text-gray-400">{kpi.unit}</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              {kpi.trendUp !== null && (
                kpi.trendUp
                  ? <TrendingUp className="w-3 h-3" style={{ color: '#14b8a6' }} />
                  : <TrendingDown className="w-3 h-3" style={{ color: '#ef4444' }} />
              )}
              <span className="text-[10px] text-gray-400">{kpi.trend}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* At-risk radar */}
      <motion.div
        variants={stagger.item}
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid #fecaca' }}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#fff5f5' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
            2 Teams zeigen erhöhte Belastungsindikatoren
          </p>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'white' }}>
          {AT_RISK.map((team) => (
            <div key={team.name} className="flex items-center justify-between gap-4 p-3 rounded-xl" style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
              <div>
                <p className="text-sm font-semibold text-gray-800">{team.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Belastungs-Index: <span className="font-semibold" style={{ color: '#ef4444' }}>{team.belastung}/10</span>
                  {' '}· {team.members} Mitglieder · Trend {team.trend}
                </p>
              </div>
              <button
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl"
                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
              >
                Maßnahme vorschlagen
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-400 px-1">
            Alle Werte sind anonymisiert. Individualdaten sind nicht einsehbar.
          </p>
        </div>
      </motion.div>

      {/* Trend chart */}
      <motion.div variants={stagger.item} className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Vitalitäts-Index – letzte 12 Wochen</h2>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={TREND_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 85]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: '#0a1f1c', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
                formatter={(v: number | undefined) => [`${v}`, 'VI']}
              />
              <Line type="monotone" dataKey="vi" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 3, fill: '#14b8a6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Team health table */}
      <motion.div variants={stagger.item} className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(200, 15%, 88%)' }}>
          <h2 className="text-sm font-semibold text-gray-700">Team-Health Übersicht</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Team', 'Mitglieder', 'Aktiv', 'VI', 'Trend', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAMS.map((team, i) => (
                <tr key={team.name} style={{ borderTop: i > 0 ? '1px solid hsl(200, 15%, 93%)' : 'none' }}>
                  <td className="px-4 py-3 pl-5 font-medium text-gray-800">{team.name}</td>
                  <td className="px-4 py-3 text-gray-500">{team.members}</td>
                  <td className="px-4 py-3 text-gray-500">{team.active}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold" style={{ color: viColor(team.vi) }}>{team.vi}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {team.trend === 'up' ? '↑' : team.trend === 'down' ? '↓' : '→'}
                  </td>
                  <td className="px-4 py-3 pr-5">
                    <button className="text-xs font-medium" style={{ color: '#14b8a6' }}>Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t" style={{ background: '#f9fafb', borderColor: 'hsl(200, 15%, 88%)' }}>
          <p className="text-xs text-gray-400">
            Alle Analysen basieren auf anonymisierten Aggregatdaten (min. 5 Einträge)
          </p>
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={stagger.item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Download,      label: 'ESG-Report (CSV)',     color: '#14b8a6', bg: '#f0fdf9' },
          { icon: ClipboardList, label: 'Neue Umfrage',         color: '#4c8448', bg: '#f2f7f4' },
          { icon: UserPlus,      label: 'Mitarbeiter einladen', color: '#f59e0b', bg: '#fffbeb' },
          { icon: BarChart2,     label: 'Maßnahmen-Hub',        color: '#6d28d9', bg: '#f5f3ff' },
        ].map(({ icon: Icon, label, color, bg }) => (
          <button
            key={label}
            className="flex items-center gap-3 p-3.5 rounded-2xl text-sm font-medium card-lift text-left"
            style={{ background: bg }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
            <span style={{ color: color === '#f59e0b' ? '#92400e' : color === '#6d28d9' ? '#5b21b6' : color }}>{label}</span>
          </button>
        ))}
      </motion.div>
    </motion.div>
  )
}
