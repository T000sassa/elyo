import { auth } from "@/lib/auth";
import { NextResponse, NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const path = nextUrl.pathname;

  // Bearer-Token aus Authorization-Header als Cookie injizieren
  // (React Native Web kann Cookie-Header nicht manuell setzen — forbidden header)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && !req.cookies.get("authjs.session-token")) {
    const token = authHeader.slice(7);
    const newHeaders = new Headers(req.headers);
    const existing = req.headers.get("cookie") ?? "";
    newHeaders.set(
      "cookie",
      existing ? `${existing}; authjs.session-token=${token}` : `authjs.session-token=${token}`
    );
    return NextResponse.next({ request: { headers: newHeaders } });
  }

  // Normaler NextAuth-Flow für alle anderen Requests
  return (auth as any)((authReq: any) => {
    const session = authReq.auth;

    if (!session) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (
        path.startsWith("/company") ||
        path.startsWith("/employee")
      ) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      return NextResponse.next();
    }

    const role = session.user.role;

    if (path.startsWith("/company") && role === "EMPLOYEE") {
      return NextResponse.redirect(new URL("/employee/dashboard", req.url));
    }
    if (path.startsWith("/employee") && (role === "COMPANY_ADMIN" || role === "COMPANY_MANAGER")) {
      return NextResponse.redirect(new URL("/company/dashboard", req.url));
    }
    if (path.startsWith("/api/company") && role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (path.startsWith("/api/employee") && (role === "COMPANY_ADMIN" || role === "COMPANY_MANAGER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.next();
  })(req, {} as any);
}

export const config = {
  matcher: [
    "/company/:path*",
    "/employee/:path*",
    "/api/company/:path*",
    "/api/employee/:path*",
  ],
};
