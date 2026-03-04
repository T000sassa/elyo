"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

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

    // Fetch session to determine role-based redirect
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role;

    if (role === "EMPLOYEE") {
      router.push("/employee/dashboard");
    } else {
      router.push("/company/dashboard");
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-xl">Anmelden</CardTitle>
        <CardDescription>Melde dich mit deiner ELYO-Zugangsdaten an.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@unternehmen.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-elyo-500 hover:bg-elyo-600 text-white"
            disabled={loading}
          >
            {loading ? "Anmelden..." : "Anmelden"}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          Noch kein Konto?{" "}
          <Link href="/auth/register" className="text-elyo-600 hover:underline font-medium">
            Unternehmen registrieren
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
