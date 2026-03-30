// Mobile-Login Proxy — löst das Browser-HttpOnly-Cookie-Problem für React Native Web
// Führt den NextAuth-Flow server-seitig aus und gibt den Session-Token im JSON-Body zurück
import { NextRequest, NextResponse } from "next/server";

const INTERNAL_BASE = "http://localhost:3000";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "E-Mail und Passwort erforderlich." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Step 1: CSRF Token + Cookie holen
  const csrfRes = await fetch(`${INTERNAL_BASE}/api/auth/csrf`);
  const csrfCookie = csrfRes.headers.get("set-cookie") ?? "";
  const csrfTokenMatch = csrfCookie.match(/authjs\.csrf-token=([^;]+)/);
  const { csrfToken } = await csrfRes.json();

  if (!csrfToken || !csrfTokenMatch) {
    return NextResponse.json(
      { error: "CSRF-Token konnte nicht abgerufen werden." },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  // Step 2: Login — CSRF-Cookie zurückschicken (Node.js kann set-cookie lesen)
  const loginRes = await fetch(
    `${INTERNAL_BASE}/api/auth/callback/credentials`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `authjs.csrf-token=${csrfTokenMatch[1]}`,
      },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        redirect: "false",
        json: "true",
      }).toString(),
      redirect: "manual",
    }
  );

  const setCookie = loginRes.headers.get("set-cookie") ?? "";
  const sessionMatch = setCookie.match(/authjs\.session-token=([^;]+)/);

  if (!sessionMatch) {
    return NextResponse.json(
      { error: "Ungültige Zugangsdaten." },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  // Step 3: Session-Daten holen und mit Token zurückgeben
  const sessionRes = await fetch(`${INTERNAL_BASE}/api/auth/session`, {
    headers: { Cookie: `authjs.session-token=${sessionMatch[1]}` },
  });
  const session = await sessionRes.json();

  return NextResponse.json(
    { token: sessionMatch[1], user: session.user },
    { headers: CORS_HEADERS }
  );
}
