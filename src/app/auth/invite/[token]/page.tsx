"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface InviteInfo {
  valid: boolean;
  error?: string;
  company?: { name: string };
  email?: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [form, setForm] = useState({ name: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/invite/verify?token=${token}`)
      .then((r) => r.json())
      .then(setInvite);
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...form }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Fehler beim Registrieren.");
      return;
    }

    router.push("/auth/login?invited=1");
  }

  if (!invite) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-elyo-500" />
      </div>
    );
  }

  if (!invite.valid) {
    return (
      <Card className="shadow-card">
        <CardContent className="pt-6 text-center">
          <p className="text-red-600 font-medium">{invite.error}</p>
          <p className="text-sm text-slate-500 mt-2">
            Bitte frage nach einem neuen Einladungslink.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-xl">Einladung annehmen</CardTitle>
        <CardDescription>
          Du wurdest eingeladen, dem Team von{" "}
          <strong>{invite.company?.name}</strong> beizutreten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          {invite.email && (
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input value={invite.email} disabled />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Dein Name</Label>
            <Input
              id="name"
              placeholder="Max Muster"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort wählen</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mindestens 8 Zeichen"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-elyo-500 hover:bg-elyo-600 text-white"
            disabled={loading}
          >
            {loading ? "Wird erstellt..." : "Konto erstellen & loslegen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
