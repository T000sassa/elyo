"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("E-Mail oder Passwort falsch.");
      return;
    }

    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role;

    if (role === "EMPLOYEE") {
      router.push("/employee/dashboard");
    } else {
      router.push("/company/dashboard");
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
    transition: "border-color 0.15s ease",
  } as React.CSSProperties;

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h2
          className="text-2xl font-semibold text-gray-900"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Willkommen zurück
        </h2>
        <p className="text-gray-400 text-sm mt-1">Melde dich mit deinen Zugangsdaten an.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="text-sm px-4 py-3 rounded-xl"
            style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
          >
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">E-Mail</label>
          <input
            type="email"
            placeholder="name@unternehmen.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = "#14b8a6")}
            onBlur={e => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passwort</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = "#14b8a6")}
            onBlur={e => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 mt-2"
          style={{
            background: loading ? "#9ca3af" : "linear-gradient(135deg, #14b8a6, #0d9488)",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Anmelden…
            </>
          ) : (
            <>
              Anmelden <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-6">
        Noch kein Konto?{" "}
        <Link href="/auth/register" className="font-semibold hover:underline" style={{ color: "#14b8a6" }}>
          Unternehmen registrieren
        </Link>
      </p>
    </div>
  );
}
