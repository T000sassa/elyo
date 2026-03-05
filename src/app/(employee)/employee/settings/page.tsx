"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Check, User } from "lucide-react";

export default function EmployeeSettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/employee/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (res.ok) {
      await update({ name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const d = await res.json();
      setError(d.error?.fieldErrors?.name?.[0] ?? "Fehler beim Speichern.");
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "0.625rem 0.875rem",
    borderRadius: "0.75rem",
    border: "1px solid hsl(200, 15%, 88%)",
    background: "#fafaf9",
    fontSize: "0.875rem",
    color: "#111827",
    outline: "none",
  } as React.CSSProperties;

  return (
    <div className="space-y-8 max-w-lg animate-fade-up">
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">Konto</p>
        <h1
          className="text-3xl font-semibold text-gray-900"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Einstellungen
        </h1>
      </div>

      {/* Profile */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid hsl(200, 15%, 88%)" }}
      >
        <div
          className="flex items-center gap-2 px-6 py-4"
          style={{ background: "#fafaf9", borderBottom: "1px solid hsl(200, 15%, 88%)" }}
        >
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Mein Profil</span>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4" style={{ background: "#ffffff" }}>
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-xl"
              style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
            >
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "#14b8a6")}
              onBlur={e => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">E-Mail</label>
            <input
              value={session?.user?.email ?? ""}
              disabled
              style={{ ...inputStyle, background: "#f3f4f6", color: "#9ca3af", cursor: "not-allowed" }}
            />
            <p className="text-xs text-gray-400">E-Mail kann nicht geändert werden.</p>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: saved ? "#4c8448" : "linear-gradient(135deg, #14b8a6, #0d9488)" }}
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Speichern…</>
              ) : saved ? (
                <><Check className="w-4 h-4" />Gespeichert</>
              ) : "Speichern"}
            </button>
          </div>
        </form>
      </div>

      {/* Account info */}
      <div
        className="rounded-2xl p-6 space-y-3"
        style={{ background: "#fafaf9", border: "1px solid hsl(200, 15%, 88%)" }}
      >
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Konto-Info</p>
        <div className="flex justify-between text-sm py-2" style={{ borderBottom: "1px solid #f0ede8" }}>
          <span className="text-gray-400">Rolle</span>
          <span className="font-medium text-gray-700">Mitarbeiter</span>
        </div>
        <div className="flex justify-between text-sm py-2">
          <span className="text-gray-400">Mitglied seit</span>
          <span className="font-medium text-gray-700">—</span>
        </div>
      </div>
    </div>
  );
}
