'use client'

import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

export function TrendChartClient({ data }: { data: Array<{ period: string; vitalityIndex: number }> }) {
  if (data.length === 0) {
    return (
      <p style={{ padding: 24, textAlign: 'center', color: 'var(--elyo-ink-mute)' }}>
        Noch keine Daten — Trend erscheint nach den ersten Check-ins.
      </p>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--elyo-line)" />
        <XAxis dataKey="period" stroke="var(--elyo-ink-mute)" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} stroke="var(--elyo-ink-mute)" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid var(--elyo-line)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="vitalityIndex"
          stroke="var(--elyo-green-500)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
