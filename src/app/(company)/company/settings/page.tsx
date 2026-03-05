"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Building2, Check, Shield } from "lucide-react";

interface CompanyData {
  name: string;
  industry: string;
  billingEmail: string;
  checkinFrequency: "DAILY" | "WEEKLY";
  anonymityThreshold: number;
}

export default function CompanySettingsPage() {
  const [data, setData] = useState<CompanyData>({
    name: "", industry: "", billingEmail: "", checkinFrequency: "WEEKLY", anonymityThreshold: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/company/settings-data")
      .then(r => r.json())
      .then(d => { if (d.data) setData(d.data); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/company/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, anonymityThreshold: Number(data.anonymityThreshold) }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setError("Fehler beim Speichern.");
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

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-gray-400 text-sm pt-8">
        <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
        Laden…
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-lg animate-fade-up">
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">Administration</p>
        <h1 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Einstellungen
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Unternehmen */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(200, 15%, 88%)" }}>
          <div className="flex items-center gap-2 px-6 py-4" style={{ background: "#fafaf9", borderBottom: "1px solid hsl(200, 15%, 88%)" }}>
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Unternehmen</span>
          </div>
          <div className="p-6 space-y-4" style={{ background: "#ffffff" }}>
            {error && (
              <div className="text-sm px-4 py-3 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unternehmensname</label>
              <input value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "#14b8a6")}
                onBlur={e => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Branche</label>
              <input value={data.industry} onChange={e => setData(d => ({ ...d, industry: e.target.value }))}
                placeholder="z.B. Technologie, Gesundheitswesen…" style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "#14b8a6")}
                onBlur={e => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Billing-E-Mail</label>
              <input type="email" value={data.billingEmail} onChange={e => setData(d => ({ ...d, billingEmail: e.target.value }))}
                placeholder="billing@unternehmen.de" style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "#14b8a6")}
                onBlur={e => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in Frequenz</label>
              <select value={data.checkinFrequency} onChange={e => setData(d => ({ ...d, checkinFrequency: e.target.value as "DAILY" | "WEEKLY" }))}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "#14b8a6")}
                onBlur={e => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}>
                <option value="WEEKLY">Wöchentlich</option>
                <option value="DAILY">Täglich</option>
              </select>
            </div>
          </div>
        </div>

        {/* Datenschutz */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(200, 15%, 88%)" }}>
          <div className="flex items-center gap-2 px-6 py-4" style={{ background: "#fafaf9", borderBottom: "1px solid hsl(200, 15%, 88%)" }}>
            <Shield className="w-4 h-4" style={{ color: "#14b8a6" }} />
            <span className="text-sm font-semibold text-gray-700">Datenschutz & Anonymisierung</span>
          </div>
          <div className="p-6 space-y-4" style={{ background: "#ffffff" }}>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Anonymitäts-Schwellenwert</label>
              <div className="flex items-center gap-4">
                <input type="range" min={3} max={20} value={data.anonymityThreshold}
                  onChange={e => setData(d => ({ ...d, anonymityThreshold: Number(e.target.value) }))}
                  className="flex-1" style={{ accentColor: "#14b8a6" }} />
                <span className="w-12 text-center text-lg font-semibold" style={{ color: "#14b8a6", fontFamily: "'Fraunces', Georgia, serif" }}>
                  {data.anonymityThreshold}
                </span>
              </div>
              <p className="text-xs text-gray-400">Mindestanzahl MA, bevor Daten erscheinen. Min. 3, empfohlen ≥ 5.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: saved ? "#4c8448" : "linear-gradient(135deg, #14b8a6, #0d9488)" }}>
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Speichern…</>
            ) : saved ? (
              <><Check className="w-4 h-4" />Gespeichert</>
            ) : "Änderungen speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
