'use client'

import { useState } from 'react'

export default function ReportsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [quarter, setQuarter] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)

  function handleDownload() {
    const params = new URLSearchParams({ year: String(year) })
    if (quarter !== undefined) params.set('quarter', String(quarter))
    setIsLoading(true)
    window.open(`/api/reports/esg/pdf?${params.toString()}`, '_blank')
    setTimeout(() => setIsLoading(false), 3000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1
        className="text-2xl font-semibold text-gray-900 mb-1"
        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
      >
        Berichte
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Lade deinen ESG-Vitalit&auml;tsbericht als PDF herunter.
      </p>

      <div className="flex gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600" htmlFor="year-select">
            Jahr
          </label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600" htmlFor="quarter-select">
            Quartal
          </label>
          <select
            id="quarter-select"
            value={quarter ?? ''}
            onChange={(e) => setQuarter(e.target.value === '' ? undefined : Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
          >
            <option value="">Ganzes Jahr</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
        style={{ backgroundColor: '#1B4D3E' }}
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Wird generiert&hellip;
          </>
        ) : (
          <>
            <span>&#128196;</span>
            PDF herunterladen
          </>
        )}
      </button>
    </div>
  )
}
