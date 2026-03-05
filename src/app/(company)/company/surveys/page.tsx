"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Plus, Play, Square, Trash2, BarChart2, ChevronDown, ChevronUp,
  MessageSquare, ToggleLeft, List, Loader2, AlertTriangle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type SurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED";
type QuestionType = "SCALE" | "MULTIPLE_CHOICE" | "TEXT" | "YES_NO";

interface Survey {
  id: string;
  title: string;
  description?: string | null;
  status: SurveyStatus;
  createdAt: string;
  _count: { responses: number; questions: number };
}

interface QuestionResult {
  questionId: string;
  text: string;
  type: QuestionType;
  answerCount: number;
  avgValue?: number | null;
  trueCount?: number;
  falseCount?: number;
  options?: { value: string | null; count: number }[];
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
}

interface SurveyResults {
  survey: { id: string; title: string; status: SurveyStatus };
  responseCount: number;
  questions: QuestionResult[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SurveyStatus, { label: string; bg: string; color: string }> = {
  DRAFT: { label: "Entwurf", bg: "#f3f4f6", color: "#6b7280" },
  ACTIVE: { label: "Aktiv", bg: "#f0fdf9", color: "#0d9488" },
  CLOSED: { label: "Geschlossen", bg: "#fef2f2", color: "#dc2626" },
};

const TYPE_ICON: Record<QuestionType, React.ReactNode> = {
  SCALE: <BarChart2 className="w-3 h-3" />,
  MULTIPLE_CHOICE: <List className="w-3 h-3" />,
  TEXT: <MessageSquare className="w-3 h-3" />,
  YES_NO: <ToggleLeft className="w-3 h-3" />,
};

const TYPE_LABEL: Record<QuestionType, string> = {
  SCALE: "Skala",
  MULTIPLE_CHOICE: "Mehrfachauswahl",
  TEXT: "Freitext",
  YES_NO: "Ja/Nein",
};

// ── QuestionResultCard ────────────────────────────────────────────────────────

function QuestionResultCard({ q }: { q: QuestionResult }) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}>
      <div className="flex items-start gap-2">
        <span className="text-gray-400 mt-0.5 flex-shrink-0">{TYPE_ICON[q.type]}</span>
        <p className="text-sm font-semibold text-gray-700">{q.text}</p>
      </div>
      <p className="text-xs text-gray-400">{q.answerCount} Antworten</p>

      {q.type === "SCALE" && q.avgValue != null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{q.scaleMinLabel ?? "1"}</span>
            <span className="text-xl font-semibold" style={{ color: "#14b8a6", fontFamily: "'Fraunces', Georgia, serif" }}>
              {q.avgValue.toFixed(1)}
            </span>
            <span>{q.scaleMaxLabel ?? "10"}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(q.avgValue / 10) * 100}%`, background: "linear-gradient(90deg, #14b8a6, #0d9488)" }}
            />
          </div>
        </div>
      )}

      {q.type === "YES_NO" && q.trueCount !== undefined && (
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg p-2 text-center" style={{ background: "#f0fdf9" }}>
            <p className="text-lg font-bold" style={{ color: "#0d9488" }}>{q.trueCount}</p>
            <p className="text-xs text-gray-400">Ja</p>
          </div>
          <div className="flex-1 rounded-lg p-2 text-center" style={{ background: "#fef2f2" }}>
            <p className="text-lg font-bold" style={{ color: "#dc2626" }}>{q.falseCount}</p>
            <p className="text-xs text-gray-400">Nein</p>
          </div>
        </div>
      )}

      {q.type === "MULTIPLE_CHOICE" && q.options && (
        <div className="space-y-1.5">
          {q.options.map((opt, i) => {
            const total = q.options!.reduce((s, o) => s + o.count, 0);
            const pct = total > 0 ? (opt.count / total) * 100 : 0;
            return (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{opt.value ?? "—"}</span>
                  <span>{opt.count} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#14b8a6" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {q.type === "TEXT" && (
        <p className="text-xs text-gray-400 italic">Freitextantworten werden aus Datenschutzgründen nicht angezeigt.</p>
      )}
    </div>
  );
}

// ── SurveyCard ────────────────────────────────────────────────────────────────

function SurveyCard({
  survey,
  onStatusChange,
  onDelete,
}: {
  survey: Survey;
  onStatusChange: (id: string, status: SurveyStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<SurveyResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [acting, setActing] = useState(false);

  const sc = STATUS_CONFIG[survey.status];

  async function loadResults() {
    if (results) return;
    setLoadingResults(true);
    const res = await fetch(`/api/company/surveys/${survey.id}/results`);
    const data = await res.json();
    setResults(data);
    setLoadingResults(false);
  }

  function toggleResults() {
    if (!showResults) loadResults();
    setShowResults((s) => !s);
  }

  async function changeStatus(status: SurveyStatus) {
    setActing(true);
    const res = await fetch(`/api/company/surveys/${survey.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setActing(false);
    if (res.ok) onStatusChange(survey.id, data.survey.status);
  }

  async function deleteSurvey() {
    if (!confirm(`Umfrage "${survey.title}" wirklich löschen?`)) return;
    setActing(true);
    await fetch(`/api/company/surveys/${survey.id}`, { method: "DELETE" });
    onDelete(survey.id);
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #f0ede8", background: "#ffffff" }}>
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800 truncate">{survey.title}</p>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: sc.bg, color: sc.color }}
            >
              {sc.label}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-0.5">
            <p className="text-xs text-gray-400">{survey._count.questions} Fragen</p>
            <p className="text-xs text-gray-400">{survey._count.responses} Antworten</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {survey.status === "DRAFT" && (
            <button
              onClick={() => changeStatus("ACTIVE")}
              disabled={acting}
              title="Aktivieren"
              className="p-2 rounded-xl transition-all"
              style={{ background: "#f0fdf9", color: "#0d9488" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#d1fae5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f0fdf9"; }}
            >
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </button>
          )}
          {survey.status === "ACTIVE" && (
            <button
              onClick={() => changeStatus("CLOSED")}
              disabled={acting}
              title="Schließen"
              className="p-2 rounded-xl transition-all"
              style={{ background: "#fffbeb", color: "#d97706" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fde68a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fffbeb"; }}
            >
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
            </button>
          )}

          {survey._count.responses > 0 && (
            <button
              onClick={toggleResults}
              className="p-2 rounded-xl transition-all"
              style={{ background: showResults ? "#e0f2fe" : "#f3f4f6", color: showResults ? "#0284c7" : "#6b7280" }}
            >
              {showResults ? <ChevronUp className="w-4 h-4" /> : <BarChart2 className="w-4 h-4" />}
            </button>
          )}

          {survey.status === "DRAFT" && (
            <button
              onClick={deleteSurvey}
              disabled={acting}
              className="p-2 rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div className="px-5 pb-5 space-y-3" style={{ borderTop: "1px solid #f0ede8" }}>
          <div className="pt-4">
            {loadingResults ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Ergebnisse laden…
              </div>
            ) : results ? (
              <>
                <p className="text-xs text-gray-400 mb-3">{results.responseCount} Teilnehmer gesamt</p>
                <div className="space-y-2">
                  {results.questions.map((q) => (
                    <QuestionResultCard key={q.questionId} q={q} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Survey Builder ────────────────────────────────────────────────────────────

interface DraftQuestion {
  text: string;
  type: QuestionType;
  order: number;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  options: string;
}

function SurveyBuilder({ onCreated, onClose }: { onCreated: (survey: Survey) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { text: "", type: "SCALE", order: 0, scaleMinLabel: "Stimme nicht zu", scaleMaxLabel: "Stimme voll zu", options: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { text: "", type: "SCALE", order: prev.length, scaleMinLabel: "", scaleMaxLabel: "", options: "" },
    ]);
  }

  function updateQuestion(i: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function removeQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i).map((q, idx) => ({ ...q, order: idx })));
  }

  async function save() {
    setError("");
    if (!title.trim()) { setError("Titel ist erforderlich."); return; }
    if (questions.some((q) => !q.text.trim())) { setError("Alle Fragen benötigen einen Text."); return; }

    setSaving(true);
    const res = await fetch("/api/company/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          type: q.type,
          order: q.order,
          isRequired: true,
          options: q.type === "MULTIPLE_CHOICE" && q.options
            ? q.options.split("\n").map((o) => o.trim()).filter(Boolean)
            : undefined,
          scaleMinLabel: q.type === "SCALE" ? q.scaleMinLabel : undefined,
          scaleMaxLabel: q.type === "SCALE" ? q.scaleMaxLabel : undefined,
        })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      onCreated({ ...data.survey, _count: { responses: 0, questions: questions.length } });
    } else {
      setError("Fehler beim Erstellen.");
    }
  }

  const inp = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.75rem",
    border: "1px solid hsl(200, 15%, 88%)",
    background: "#fafaf9",
    fontSize: "0.875rem",
    outline: "none",
  } as React.CSSProperties;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel der Umfrage…"
          style={{ ...inp, fontSize: "1rem", fontWeight: 600 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#14b8a6")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Beschreibung (optional)…"
          rows={2}
          style={{ ...inp, resize: "none" } as React.CSSProperties}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#14b8a6")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
        />
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 w-5 text-center flex-shrink-0">{i + 1}</span>
              <input
                value={q.text}
                onChange={(e) => updateQuestion(i, { text: e.target.value })}
                placeholder="Frage…"
                style={{ ...inp, flex: 1 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#14b8a6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
              />
              <select
                value={q.type}
                onChange={(e) => updateQuestion(i, { type: e.target.value as QuestionType })}
                style={{ ...inp, width: "auto" }}
              >
                {(["SCALE", "YES_NO", "MULTIPLE_CHOICE", "TEXT"] as QuestionType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(i)} className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {q.type === "SCALE" && (
              <div className="flex gap-2 pl-7">
                <input
                  value={q.scaleMinLabel}
                  onChange={(e) => updateQuestion(i, { scaleMinLabel: e.target.value })}
                  placeholder="Min-Label (1)"
                  style={{ ...inp, flex: 1 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#14b8a6")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
                />
                <input
                  value={q.scaleMaxLabel}
                  onChange={(e) => updateQuestion(i, { scaleMaxLabel: e.target.value })}
                  placeholder="Max-Label (10)"
                  style={{ ...inp, flex: 1 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#14b8a6")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
                />
              </div>
            )}

            {q.type === "MULTIPLE_CHOICE" && (
              <div className="pl-7">
                <textarea
                  value={q.options}
                  onChange={(e) => updateQuestion(i, { options: e.target.value })}
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  rows={3}
                  style={{ ...inp, resize: "none" } as React.CSSProperties}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#14b8a6")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
                />
                <p className="text-xs text-gray-400 mt-1">Eine Option pro Zeile</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 transition-colors"
        style={{ border: "2px dashed #e5e7eb" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#a7f3d0"; e.currentTarget.style.color = "#0d9488"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}
      >
        <Plus className="w-4 h-4 inline mr-1" /> Frage hinzufügen
      </button>

      {error && (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
        style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
        Umfrage als Entwurf speichern
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CompanySurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/company/surveys")
      .then((r) => r.json())
      .then((d) => setSurveys(d.surveys ?? []))
      .finally(() => setLoading(false));
  }, []);

  function handleCreated(survey: Survey) {
    setSurveys((prev) => [survey, ...prev]);
    setShowBuilder(false);
  }

  function handleStatusChange(id: string, status: SurveyStatus) {
    setSurveys((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  function handleDelete(id: string) {
    setSurveys((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">Engagement</p>
          <h1
            className="text-3xl font-semibold text-gray-900 leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Pulsbefragungen
          </h1>
          <p className="text-gray-400 text-sm mt-1">Anonyme Mitarbeiterumfragen erstellen und auswerten</p>
        </div>
        <button
          onClick={() => setShowBuilder((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
        >
          <Plus className="w-4 h-4" />
          Neue Umfrage
        </button>
      </div>

      {showBuilder && (
        <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid hsl(200, 15%, 88%)" }}>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-gray-700">Neue Umfrage erstellen</p>
            <button onClick={() => setShowBuilder(false)} className="text-gray-400 hover:text-gray-600 text-xs">Abbrechen</button>
          </div>
          <SurveyBuilder onCreated={handleCreated} onClose={() => setShowBuilder(false)} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm pt-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Laden…
        </div>
      ) : surveys.length === 0 && !showBuilder ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}>
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-gray-700">Noch keine Umfragen</p>
          <p className="text-sm text-gray-400 mt-1">Erstelle deine erste Pulsbefragung.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map((s) => (
            <SurveyCard key={s.id} survey={s} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
