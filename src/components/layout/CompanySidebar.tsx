"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  ClipboardList,
  Settings,
  LogOut,
} from "lucide-react";

const nav = [
  { href: "/company/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/company/teams", label: "Teams", icon: Users },
  { href: "/company/reports", label: "Reports", icon: BarChart2 },
  { href: "/company/surveys", label: "Umfragen", icon: ClipboardList },
  { href: "/company/settings", label: "Einstellungen", icon: Settings },
];

export function CompanySidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-white border-r border-slate-200 px-3 py-6">
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-8 h-8 rounded-xl bg-elyo-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">E</span>
        </div>
        <span className="font-bold text-slate-800 text-lg">ELYO</span>
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-elyo-50 text-elyo-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/auth/login" })}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors mt-4"
      >
        <LogOut className="w-4 h-4" />
        Abmelden
      </button>
    </aside>
  );
}
