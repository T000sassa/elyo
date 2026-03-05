"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Slider } from "@/components/ui/slider";
import { Lock, Check, ArrowRight } from "lucide-react";

const MOOD_EMOJIS   = ["","😞","😔","😕","😐","🙂","😊","😄","😁","🤩","🥰"];
const ENERGY_EMOJIS = ["","😴","🥱","😔","😐","🙂","💪","⚡","🔥","🚀","✨"];
const STRESS_EMOJIS = ["","🧘","😌","🙂","😐","😤","😰","😫","🤯","💥","🆘"];

const STEPS = ["Stimmung", "Stress", "Energie", "Notiz"] as const;

function scoreColor(score: number) {
  if (score >= 7.5) return "#14b8a6";
  if (score >= 6) return "#4c8448";
  if (score >= 4.5) return "#d97706";
  return "#ef4444";
}

function LiveScore({ mood, stress, energy }: { mood: number; stress: number; energy: number }) {
  const score = (mood + (11 - stress) + energy) / 3;
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-400">Live-Score</span>
      <span
        className="text-sm font-bold transition-all duration-300"
        style={{ color, fontFamily: "'Fraunces', Georgia, serif" }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function SliderStep({
  label,
  description,
  value,
  onChange,
  emojis,
  minLabel,
  maxLabel,
  accentColor,
  trackColor,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  emojis: string[];
  minLabel: string;
  maxLabel: string;
  accentColor: string;
  trackColor: string;
}) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <div className="text-6xl mb-4 transition-all duration-200">{emojis[value]}</div>
        <h2
          className="text-2xl font-semibold text-gray-900"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {label}
        </h2>
        <p className="text-gray-400 text-sm mt-1">{description}</p>
      </div>

      {/* Value display */}
      <div className="flex items-center justify-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white transition-all duration-300"
          style={{ background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor})` }}
        >
          {value}
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-2 px-2">
        <Slider
          min={1}
          max={10}
          step={1}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            className="rounded-full transition-all duration-150"
            style={{
              width: i + 1 === value ? 20 : 8,
              height: 8,
              background: i + 1 <= value ? accentColor : "#e5e7eb",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SuccessScreen({ score }: { score: number }) {
  const router = useRouter();
  const color = scoreColor(score);

  return (
    <div className="text-center space-y-6 animate-fade-up">
      <div
        className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)`, border: `1px solid ${color}44` }}
      >
        <Check className="w-10 h-10" style={{ color }} />
      </div>
      <div>
        <h2
          className="text-2xl font-semibold text-gray-900"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Check-in gespeichert!
        </h2>
        <p className="text-gray-400 text-sm mt-2">Danke, dass du dir diese Zeit genommen hast.</p>
      </div>

      {/* Score display */}
      <div
        className="inline-flex flex-col items-center px-8 py-5 rounded-2xl"
        style={{ background: `${color}11`, border: `1px solid ${color}33` }}
      >
        <p className="text-xs font-medium text-gray-400 mb-1">Dein Wellbeing-Score</p>
        <p
          className="text-5xl font-bold leading-none"
          style={{ color, fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {score.toFixed(1)}
        </p>
        <p className="text-xs text-gray-400 mt-1">von 10</p>
      </div>

      <button
        onClick={() => router.push("/employee/dashboard")}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-glow"
        style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
      >
        Zum Dashboard <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export function CheckinForm() {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState(5);
  const [stress, setStress] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);

  async function handleSubmit() {
    setLoading(true);
    const res = await fetch("/api/employee/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, stress, energy, note }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setScore(data.score);
      setDone(true);
    }
  }

  if (done) return <SuccessScreen score={score} />;

  const isLastStep = step === 3;

  return (
    <div className="max-w-md mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-semibold text-gray-900"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Wie geht es dir?
        </h1>
        <p className="text-gray-400 text-sm mt-1">Dein täglicher 2-Minuten-Check-in.</p>
      </div>

      {/* Progress + live score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className="rounded-full transition-all duration-300 cursor-pointer"
                onClick={() => i < step && setStep(i)}
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  background: i <= step ? "#14b8a6" : "#e5e7eb",
                }}
              />
            ))}
          </div>
          <LiveScore mood={mood} stress={stress} energy={energy} />
        </div>
        <p className="text-xs text-gray-400">Schritt {step + 1} von {STEPS.length}: <span className="font-medium text-gray-600">{STEPS[step]}</span></p>
      </div>

      {/* Step content */}
      <div
        className="rounded-3xl p-8"
        style={{ background: "#ffffff", border: "1px solid hsl(200, 15%, 88%)" }}
      >
        {step === 0 && (
          <SliderStep
            label="Stimmung"
            description="Wie ist deine allgemeine Stimmung gerade?"
            value={mood}
            onChange={setMood}
            emojis={MOOD_EMOJIS}
            minLabel="Sehr schlecht"
            maxLabel="Ausgezeichnet"
            accentColor="#14b8a6"
            trackColor="#f0fdf9"
          />
        )}
        {step === 1 && (
          <SliderStep
            label="Stress"
            description="Wie gestresst fühlst du dich heute?"
            value={stress}
            onChange={setStress}
            emojis={STRESS_EMOJIS}
            minLabel="Sehr entspannt"
            maxLabel="Sehr gestresst"
            accentColor="#d97706"
            trackColor="#fffbeb"
          />
        )}
        {step === 2 && (
          <SliderStep
            label="Energie"
            description="Wie energiegeladen bist du?"
            value={energy}
            onChange={setEnergy}
            emojis={ENERGY_EMOJIS}
            minLabel="Erschöpft"
            maxLabel="Voller Energie"
            accentColor="#4c8448"
            trackColor="#f2f7f4"
          />
        )}
        {step === 3 && (
          <div className="space-y-5 animate-fade-up">
            <div className="text-center">
              <div className="text-5xl mb-3">📝</div>
              <h2
                className="text-2xl font-semibold text-gray-900"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Notiz
              </h2>
              <p className="text-gray-400 text-sm mt-1">Optional — nur für dich sichtbar.</p>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Was beschäftigt dich heute? Was war positiv?"
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm text-gray-700 resize-none transition-all duration-200 outline-none"
              style={{
                background: "#fafaf9",
                border: "1px solid hsl(200, 15%, 88%)",
              }}
              onFocus={e => (e.target.style.borderColor = "#14b8a6")}
              onBlur={e => (e.target.style.borderColor = "hsl(200, 15%, 88%)")}
            />
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Lock className="w-3 h-3 flex-shrink-0" />
              Diese Notiz wird niemals an dein Unternehmen weitergegeben.
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{ background: "#f3f4f6", color: "#374151" }}
          >
            Zurück
          </button>
        )}
        {isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-glow flex items-center justify-center gap-2"
            style={{ background: loading ? "#9ca3af" : "linear-gradient(135deg, #14b8a6, #0d9488)" }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Speichern…
              </>
            ) : (
              <>
                Check-in abschicken <Check className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-glow flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
          >
            Weiter <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
