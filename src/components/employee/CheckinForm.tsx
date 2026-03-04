"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

const MOOD_EMOJIS = ["", "😞", "😔", "😕", "😐", "🙂", "😊", "😄", "😁", "🤩", "🥰"];
const ENERGY_EMOJIS = ["", "😴", "🥱", "😔", "😐", "🙂", "💪", "⚡", "🔥", "🚀", "✨"];
const STRESS_EMOJIS = ["", "🧘", "😌", "🙂", "😐", "😤", "😰", "😫", "🤯", "💥", "🆘"];

function SliderField({
  label,
  description,
  value,
  onChange,
  emojis,
  minLabel,
  maxLabel,
  colorClass,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  emojis: string[];
  minLabel: string;
  maxLabel: string;
  colorClass: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-800">{label}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <span className="text-3xl">{emojis[value]}</span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className={colorClass}
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{minLabel}</span>
        <span className="font-medium text-slate-600">{value}/10</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function CheckinSuccess({ score }: { score: number }) {
  const router = useRouter();
  return (
    <div className="text-center py-12 space-y-4">
      <div className="text-6xl">🌟</div>
      <h2 className="text-2xl font-bold text-slate-800">Check-in gespeichert!</h2>
      <p className="text-slate-500">
        Dein Wellbeing-Score heute:{" "}
        <span className="font-semibold text-elyo-600">{score.toFixed(1)}/10</span>
      </p>
      <Button
        onClick={() => router.push("/employee/dashboard")}
        className="bg-elyo-500 hover:bg-elyo-600 text-white mt-4"
      >
        Zum Dashboard
      </Button>
    </div>
  );
}

export function CheckinForm() {
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

  if (done) return <CheckinSuccess score={score} />;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Wie geht es dir heute?</h1>
        <p className="text-slate-500 mt-1">Dein Check-in dauert nur 2 Minuten.</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="pt-6 space-y-8">
          <SliderField
            label="Stimmung"
            description="Wie ist deine allgemeine Stimmung?"
            value={mood}
            onChange={setMood}
            emojis={MOOD_EMOJIS}
            minLabel="Sehr schlecht"
            maxLabel="Ausgezeichnet"
            colorClass="accent-elyo-500"
          />
          <SliderField
            label="Stress"
            description="Wie gestresst fühlst du dich?"
            value={stress}
            onChange={setStress}
            emojis={STRESS_EMOJIS}
            minLabel="Sehr entspannt"
            maxLabel="Sehr gestresst"
            colorClass="accent-amber-500"
          />
          <SliderField
            label="Energie"
            description="Wie energiegeladen bist du?"
            value={energy}
            onChange={setEnergy}
            emojis={ENERGY_EMOJIS}
            minLabel="Erschöpft"
            maxLabel="Voller Energie"
            colorClass="accent-green-500"
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Optionale Notiz{" "}
          <span className="text-slate-400 font-normal">(nur für dich)</span>
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Was beschäftigt dich heute? Diese Notiz ist streng privat."
          rows={3}
        />
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Lock className="w-3 h-3" />
          Diese Notiz wird niemals an dein Unternehmen weitergegeben.
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-elyo-500 hover:bg-elyo-600 text-white h-11 text-base"
      >
        {loading ? "Wird gespeichert..." : "Check-in abschicken ✓"}
      </Button>
    </div>
  );
}
