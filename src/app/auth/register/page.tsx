"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Registrierung fehlgeschlagen.");
      return;
    }

    router.push("/auth/login?registered=1");
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-xl">Unternehmen registrieren</CardTitle>
        <CardDescription>Starte kostenlos mit ELYO für dein Team.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="companyName">Unternehmensname</Label>
            <Input
              id="companyName"
              placeholder="Muster GmbH"
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Dein Name</Label>
            <Input
              id="name"
              placeholder="Max Muster"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail (Admin-Account)</Label>
            <Input
              id="email"
              type="email"
              placeholder="max@muster.de"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mindestens 8 Zeichen"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-elyo-500 hover:bg-elyo-600 text-white"
            disabled={loading}
          >
            {loading ? "Wird erstellt..." : "Konto erstellen"}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          Bereits registriert?{" "}
          <Link href="/auth/login" className="text-elyo-600 hover:underline font-medium">
            Anmelden
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
