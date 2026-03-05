"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  ClipboardList,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";

const nav = [
  { href: "/company/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/company/teams", label: "Teams", icon: Users },
  { href: "/company/reports", label: "Reports", icon: BarChart2 },
  { href: "/company/surveys", label: "Umfragen", icon: ClipboardList },
  { href: "/company/settings", label: "Einstellungen", icon: Settings },
];

function Initials({ name }: { name?: string | null }) {
  const parts = (name ?? "A").trim().split(" ");
  const init = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  return <span className="text-xs font-semibold text-white uppercase">{init}</span>;
}

export function CompanySidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside
      className="flex flex-col w-64 min-h-screen sidebar-texture"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2C8 2 3 5.5 3 9a5 5 0 0010 0C13 5.5 8 2 8 2z" fill="white" fillOpacity="0.9"/>
            <path d="M8 6v4M6 8h4" stroke="#0a4540" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span
          className="text-white font-semibold text-lg tracking-tight"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Elyo
        </span>
        <span
          className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(20,184,166,0.2)", color: "#5eead4" }}
        >
          Admin
        </span>
      </div>

      {/* Workspace badge */}
      <div className="mx-3 mb-4 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#5eead4" }} />
          <span className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.7)" }}>
            Unternehmensportal
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/company/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active ? "text-white" : "hover:text-white"
              )}
              style={active ? {
                background: "var(--sidebar-active-bg)",
                color: "var(--sidebar-text-active)",
                boxShadow: "inset 0 0 0 1px rgba(20,184,166,0.25)",
              } : {
                color: "var(--sidebar-text)",
              }}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: active ? "#2dd4bf" : "inherit" }}
              />
              {label}
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: "#14b8a6" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user area */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "0 12px 0", paddingTop: 12 }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
          >
            <Initials name={session?.user?.name} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {session?.user?.name ?? "Admin"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "var(--sidebar-text)" }}>
              Company Admin
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium mb-4 transition-all duration-150"
          style={{ color: "var(--sidebar-text)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "white";
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
