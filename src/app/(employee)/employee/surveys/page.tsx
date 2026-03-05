"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, ChevronRight, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "SCALE" | "MULTIPLE_CHOICE" | "TEXT" | "YES_NO";

interface SurveyListItem {
  id: string;
  title: string;
  description?: string | null;
  questionCount: number;
  completed: boolean;
  endsAt?: string | null;
}

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  order: number;
  isRequired: boolean;
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
  options?: string | null;
}

interface SurveyDetail {
  id: string;
  title: string;
  description?: string | null;
  questions: Question[];
}

type AnswerMap = Record<string, { scaleValue?: number; textValue?: string; choiceValue?: string; boolValue?: boolean }>;

// ── ScaleInput ────────────────────────────────────────────────────────────────

function ScaleInput({ value, onChange, minLabel, maxLabel }: {
  value: number | undefined;
  onChange: (v: number) => void;
  minLabel?: string | null;
  maxLabel?: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: value === n ? "linear-gradient(135deg, #14b8a6, #0d9488)" : "#f3f4f6",
              color: value === n ? "#fff" : "#6b7280",
              border: value === n ? "none" : "1px solid #e5e7eb",
            }}
          >
            {n}
          </button>
        ))}
      </div>
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── SurveyForm ────────────────────────────────────────────────────────────────

function SurveyForm({ survey, onDone, onBack }: {
  survey: SurveyDetail;
  onDone: () => void;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function setAnswer(qId: string, patch: AnswerMap[string]) {
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], ...patch } }));
  }

  async function submit() {
    setError("");

    const missing = survey.questions.filter((q) => {
      if (!q.isRequired) return false;
      const a = answers[q.id];
      if (!a) return true;
      if (q.type === "SCALE") return a.scaleValue === undefined;
      if (q.type === "TEXT") return !a.textValue?.trim();
      if (q.type === "MULTIPLE_CHOICE") return !a.choiceValue;
      if (q.type === "YES_NO") return a.boolValue === undefined;
      return false;
    });

    if (missing.length > 0) {
      setError(`Bitte beantworte alle Pflichtfragen (${missing.length} offen).`);
      return;
    }

    setSubmitting(true);
    const payload = survey.questions.map((q) => {
      const a = answers[q.id] ?? {};
      return { questionId: q.id, ...a };
    });

    const res = await fetch(`/api/employee/surveys/${survey.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload }),
    });
    setSubmitting(false);

    if (res.ok) {
      setDone(true);
      setTimeout(onDone, 2000);
    } else {
      const data = await res.json();
      setError(data.error ?? "Fehler beim Absenden.");
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
        >
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Danke!
        </h2>
        <p className="text-sm text-gray-400 mt-2">Deine Antworten wurden anonym übermittelt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Zurück
        </button>
        <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          {survey.title}
        </h2>
        {survey.description && <p className="text-sm text-gray-400 mt-1">{survey.description}</p>}
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {survey.questions.map((q, i) => {
          const ans = answers[q.id] ?? {};
          const opts = q.options ? (typeof q.options === "string" ? JSON.parse(q.options) : q.options) as string[] : [];

          return (
            <div key={q.id} className="rounded-2xl p-5 space-y-4" style={{ background: "#ffffff", border: "1px solid #f0ede8" }}>
              <p className="text-sm font-semibold text-gray-800">
                <span className="text-gray-300 mr-2">{i + 1}.</span>
                {q.text}
                {q.isRequired && <span className="text-red-400 ml-1">*</span>}
              </p>

              {q.type === "SCALE" && (
                <ScaleInput
                  value={ans.scaleValue}
                  onChange={(v) => setAnswer(q.id, { scaleValue: v })}
                  minLabel={q.scaleMinLabel}
                  maxLabel={q.scaleMaxLabel}
                />
              )}

              {q.type === "YES_NO" && (
                <div className="flex gap-3">
                  {([true, false] as const).map((val) => (
                    <button
                      key={String(val)}
                      onClick={() => setAnswer(q.id, { boolValue: val })}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: ans.boolValue === val ? (val ? "#f0fdf9" : "#fef2f2") : "#f3f4f6",
                        color: ans.boolValue === val ? (val ? "#0d9488" : "#dc2626") : "#6b7280",
                        border: ans.boolValue === val ? `1px solid ${val ? "#a7f3d0" : "#fca5a5"}` : "1px solid #e5e7eb",
                      }}
                    >
                      {val ? "Ja" : "Nein"}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2">
                  {opts.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(q.id, { choiceValue: opt })}
                      className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all"
                      style={{
                        background: ans.choiceValue === opt ? "#f0fdf9" : "#f3f4f6",
                        color: ans.choiceValue === opt ? "#0d9488" : "#374151",
                        border: ans.choiceValue === opt ? "1px solid #a7f3d0" : "1px solid transparent",
                        fontWeight: ans.choiceValue === opt ? 600 : 400,
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "TEXT" && (
                <textarea
                  value={ans.textValue ?? ""}
                  onChange={(e) => setAnswer(q.id, { textValue: e.target.value })}
                  placeholder="Deine Antwort…"
                  rows={3}
                  className="w-full text-sm px-3 py-2.5 rounded-xl outline-none resize-none"
                  style={{ border: "1px solid hsl(200, 15%, 88%)", background: "#fafaf9" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#14b8a6")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
        style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
        Antworten absenden
      </button>

      <p className="text-xs text-center text-gray-400">Deine Antworten sind anonym und werden nur aggregiert ausgewertet.</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmployeeSurveysPage() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState<SurveyDetail | null>(null);
  const [loadingSurvey, setLoadingSurvey] = useState(false);

  useEffect(() => {
    fetch("/api/employee/surveys")
      .then((r) => r.json())
      .then((d) => setSurveys(d.surveys ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function openSurvey(id: string) {
    setLoadingSurvey(true);
    const res = await fetch(`/api/employee/surveys/${id}`);
    const data = await res.json();
    setLoadingSurvey(false);
    if (res.ok) setActiveSurvey(data.survey);
  }

  function handleDone() {
    setSurveys((prev) => prev.map((s) => (s.id === activeSurvey?.id ? { ...s, completed: true } : s)));
    setActiveSurvey(null);
  }

  if (activeSurvey) {
    return (
      <div className="max-w-lg animate-fade-up">
        <SurveyForm survey={activeSurvey} onDone={handleDone} onBack={() => setActiveSurvey(null)} />
      </div>
    );
  }

  const open = surveys.filter((s) => !s.completed);
  const done = surveys.filter((s) => s.completed);

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">Mitmachen</p>
        <h1 className="text-3xl font-semibold text-gray-900 leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Umfragen
        </h1>
        <p className="text-gray-400 text-sm mt-1">Deine Antworten sind vollständig anonym.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Laden…
        </div>
      ) : surveys.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}>
          <div className="text-4xl mb-3">✅</div>
          <p className="font-semibold text-gray-700">Keine offenen Umfragen</p>
          <p className="text-sm text-gray-400 mt-1">Schau später wieder rein.</p>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Offen ({open.length})</h2>
              {open.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openSurvey(s.id)}
                  disabled={loadingSurvey}
                  className="w-full text-left rounded-2xl p-5 transition-all group"
                  style={{ background: "#ffffff", border: "1px solid #f0ede8" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#a7f3d0"; e.currentTarget.style.background = "#f0fdf9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#f0ede8"; e.currentTarget.style.background = "#ffffff"; }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                      {s.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.description}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400">{s.questionCount} Fragen</span>
                        {s.endsAt && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            bis {new Date(s.endsAt).toLocaleDateString("de-DE")}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-elyo-500 transition-colors flex-shrink-0 ml-3" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Abgeschlossen ({done.length})</h2>
              {done.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl p-5 flex items-center gap-3 opacity-60"
                  style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}
                >
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#14b8a6" }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{s.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Abgeschlossen</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
