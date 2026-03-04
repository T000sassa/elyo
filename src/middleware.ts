import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;

  if (!session) {
    if (
      path.startsWith("/company") ||
      path.startsWith("/employee") ||
      path.startsWith("/api/company") ||
      path.startsWith("/api/employee")
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  const role = session.user.role;

  // EMPLOYEE darf kein /company
  if (path.startsWith("/company") && role === "EMPLOYEE") {
    return NextResponse.redirect(new URL("/employee/dashboard", req.url));
  }

  // Company-Rollen dürfen kein /employee
  if (
    path.startsWith("/employee") &&
    (role === "COMPANY_ADMIN" || role === "COMPANY_MANAGER")
  ) {
    return NextResponse.redirect(new URL("/company/dashboard", req.url));
  }

  // API-Schutz
  if (path.startsWith("/api/company") && role === "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    path.startsWith("/api/employee") &&
    (role === "COMPANY_ADMIN" || role === "COMPANY_MANAGER")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/company/:path*",
    "/employee/:path*",
    "/api/company/:path*",
    "/api/employee/:path*",
  ],
};
