'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { CheckinSlider } from '@/components/checkin/CheckinSlider'

type Step = 1 | 2 | 3

const PLACEHOLDER_NOTES = [
  'Viel Meetings heute...',
  'Guter Start in den Tag',
  'Schlecht geschlafen...',
  'Produktiver Morgen!',
]

const slide = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit:  { x: -60, opacity: 0, transition: { duration: 0.2 } },
}

function AnimatedCheck() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill="none" stroke="#d1fae5" strokeWidth="4" />
      <circle
        cx="40" cy="40" r="36"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="226"
        strokeDashoffset="226"
        style={{ animation: 'draw-circle 0.5s ease forwards' }}
      />
      <polyline
        points="24,40 36,52 56,30"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="60"
        strokeDashoffset="60"
        style={{ animation: 'draw-check 0.4s ease 0.45s forwards' }}
      />
      <style>{`
        @keyframes draw-circle { to { stroke-dashoffset: 0; } }
        @keyframes draw-check  { to { stroke-dashoffset: 0; } }
      `}</style>
    </svg>
  )
}

export default function CheckinPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [energy, setEnergy] = useState(7)
  const [mood, setMood] = useState(7)
  const [stress, setStress] = useState(3)
  const [note, setNote] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [scoreDisplayed, setScoreDisplayed] = useState(0)

  const calculatedScore = Math.round(((energy + mood + (11 - stress)) / 30) * 100)

  useEffect(() => {
    if (step !== 3) return
    let current = 0
    const interval = setInterval(() => {
      current += 2
      if (current >= calculatedScore) {
        setScoreDisplayed(calculatedScore)
        clearInterval(interval)
      } else {
        setScoreDisplayed(current)
      }
    }, 20)

    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#14b8a6', '#f59e0b', '#5eead4', '#fcd34d'] })
    })

    return () => clearInterval(interval)
  }, [step, calculatedScore])

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PLACEHOLDER_NOTES.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pb-24 lg:pb-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {([1, 2] as const).map((s) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: step >= s ? 32 : 12, background: step >= s ? '#14b8a6' : '#e5e7eb' }}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={slide} initial="enter" animate="center" exit="exit" className="space-y-8">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Wie geht&apos;s dir heute?
                </h1>
                <p className="text-sm text-gray-400 mt-1">Nur 3 Fragen — dauert 30 Sekunden</p>
              </div>

              <div
                className="rounded-3xl p-6 space-y-8"
                style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}
              >
                <CheckinSlider label="Energie"   iconLow="🪫" iconHigh="⚡" value={energy} onChange={setEnergy} />
                <CheckinSlider label="Stimmung"  iconLow="😔" iconHigh="😄" value={mood}   onChange={setMood}   />
                <CheckinSlider label="Belastung" iconLow="😌" iconHigh="🔥" value={stress} onChange={setStress} inverted />
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all hover:shadow-glow"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                Weiter →
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={slide} initial="enter" animate="center" exit="exit" className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Optionale Notiz
                </h1>
                <p className="text-sm text-gray-400 mt-1">Was beschäftigt dich heute?</p>
              </div>

              <div className="rounded-3xl p-5" style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}>
                <textarea
                  rows={5}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={PLACEHOLDER_NOTES[placeholderIdx]}
                  className="w-full resize-none text-sm text-gray-700 outline-none placeholder-gray-300"
                  style={{ background: 'transparent' }}
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setStep(3)}
                  className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all hover:shadow-glow"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                >
                  Check-in abschließen
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="w-full py-2 text-sm font-medium text-gray-400 hover:text-gray-600"
                >
                  Überspringen →
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.4 } }}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">
                <AnimatedCheck />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Check-in gespeichert! 🎉
                </h1>
                <p className="text-sm text-gray-400 mt-2">Deine Daten sind anonym und sicher.</p>
              </div>

              <div
                className="rounded-3xl p-6"
                style={{ background: 'linear-gradient(135deg, #f0fdf9, #ffffff)', border: '1px solid #d1fae5' }}
              >
                <p className="text-xs font-medium text-gray-400 mb-1">Dein Score heute</p>
                <p
                  className="text-5xl font-bold"
                  style={{ color: '#14b8a6', fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {scoreDisplayed}
                </p>
                <p className="text-sm text-gray-400 mt-1">/100</p>
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm font-semibold text-gray-700">15 Tage Streak — weiter so!</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                Zum Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
