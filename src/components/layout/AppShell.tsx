'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useRole, type DemoRole } from '@/contexts/RoleContext'
import {
  LayoutDashboard,
  Activity,
  MapPin,
  Trophy,
  User,
  Users,
  BarChart2,
  ClipboardList,
  Settings,
  Star,
  Package,
  MessageSquare,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: React.ElementType }

const NAV_ITEMS: Record<DemoRole, NavItem[]> = {
  employee: [
    { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
    { href: '/checkin',    label: 'Check-in',   icon: Activity        },
    { href: '/partners',   label: 'Partner',    icon: MapPin          },
    { href: '/level',      label: 'Level',      icon: Trophy          },
    { href: '/profile',    label: 'Profil',     icon: User            },
  ],
  admin: [
    { href: '/company/dashboard', label: 'Übersicht',    icon: LayoutDashboard },
    { href: '/company/teams',     label: 'Teams',        icon: Users           },
    { href: '/company/surveys',   label: 'Umfragen',     icon: ClipboardList   },
    { href: '/company/reports',   label: 'Berichte',     icon: BarChart2       },
    { href: '/company/settings',  label: 'Einstellungen',icon: Settings        },
  ],
  partner: [
    { href: '/partner/profile',   label: 'Mein Profil',  icon: User          },
    { href: '/partner/offers',    label: 'Angebote',     icon: Package       },
    { href: '/partner/reviews',   label: 'Bewertungen',  icon: Star          },
    { href: '/partner/analytics', label: 'Analytics',    icon: TrendingUp    },
  ],
}

const ROLE_LABELS: Record<DemoRole, string> = {
  employee: 'Mitarbeiter',
  admin:    'HR-Admin',
  partner:  'Partner',
}

function EloyLogo() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
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
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { role } = useRole()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = NAV_ITEMS[role]

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={cn(
        'flex flex-col min-h-screen sidebar-texture transition-all duration-300',
        mobile ? 'w-64' : collapsed ? 'w-16' : 'w-64',
      )}
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Logo row */}
      <div className={cn(
        'flex items-center px-4 pt-6 pb-5',
        collapsed && !mobile ? 'justify-center' : 'justify-between',
      )}>
        {(!collapsed || mobile) && <EloyLogo />}
        {collapsed && !mobile && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2C8 2 3 5.5 3 9a5 5 0 0010 0C13 5.5 8 2 8 2z" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-6 h-6 rounded-full flex items-center justify-center ml-auto"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
          >
            {collapsed
              ? <ChevronRight className="w-3.5 h-3.5" />
              : <ChevronLeft  className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Role badge */}
      {(!collapsed || mobile) && (
        <div className="mx-3 mb-4 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xs font-medium" style={{ color: '#5eead4' }}>
            {ROLE_LABELS[role]}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/company/dashboard' && href !== '/partner/profile' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                collapsed && !mobile ? 'justify-center' : '',
                active ? 'text-white' : 'hover:text-white',
              )}
              style={active
                ? { background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-text-active)', boxShadow: 'inset 0 0 0 1px rgba(20,184,166,0.25)' }
                : { color: 'var(--sidebar-text)' }}
              title={collapsed && !mobile ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#2dd4bf' : 'inherit' }} />
              {(!collapsed || mobile) && label}
            </Link>
          )
        })}
      </nav>

      {/* User stub */}
      {(!collapsed || mobile) && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '0 12px 16px', paddingTop: 12 }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
              <span className="text-xs font-semibold text-white">SM</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">Sarah M.</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--sidebar-text)' }}>{ROLE_LABELS[role]}</p>
            </div>
            <Bell className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
        </div>
      )}
    </aside>
  )

  return (
    <div className="flex min-h-screen" style={{ background: 'hsl(40, 20%, 97%)' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50">
            <SidebarContent mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b" style={{ background: 'white', borderColor: 'hsl(200, 15%, 88%)' }}>
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg" style={{ color: '#6b7280' }}>
            <Menu className="w-5 h-5" />
          </button>
          <EloyLogo />
        </header>

        <main className="flex-1 p-6 lg:p-8 xl:p-10 max-w-5xl">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 z-30" style={{ background: 'white', borderTop: '1px solid hsl(200, 15%, 88%)' }}>
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl"
                style={{ color: active ? '#14b8a6' : '#9ca3af' }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
