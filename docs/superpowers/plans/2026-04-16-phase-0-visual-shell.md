# ELYO Phase 0 – Visual Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully-designed, clickable demo shell for ELYO — all three roles (Employee, Company Admin, Partner) navigable with hardcoded mock data, no real backend calls.

**Architecture:** New `(app)` route group sits alongside the existing `(employee)` and `(company)` real-backend groups — no conflicts since Next.js route group names don't become URL segments. A `RoleContext` (React Context) holds the active demo role and a floating `RoleSwitcher` button lets users toggle between roles at any time. All data is hardcoded in each page file.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS (existing tokens + new amber) · Framer Motion 11 · canvas-confetti · Recharts (already installed) · Radix UI (already installed)

---

## File Map

**New files to create:**
- `src/contexts/RoleContext.tsx` — demo role state (employee | admin | partner)
- `src/components/layout/AppShell.tsx` — unified collapsible sidebar + mobile bottom-nav, role-aware
- `src/components/layout/RoleSwitcher.tsx` — floating debug button (demo mode only)
- `src/components/ui/metric-chip.tsx` — Zahl + Label + Trend-Pfeil chip
- `src/components/ui/score-gauge.tsx` — SVG semicircle gauge, animated
- `src/components/ui/progress-bar.tsx` — labelled bar with milestone markers
- `src/components/ui/level-badge.tsx` — STARTER/BRONZE/SILVER/GOLD/PLATINUM badge
- `src/app/(app)/layout.tsx` — wraps children in AppShell + RoleProvider
- `src/app/(app)/dashboard/page.tsx` — Employee dashboard mock (Prompt 0.2)
- `src/app/(app)/checkin/page.tsx` — 3-step check-in flow (Prompt 0.3)
- `src/components/checkin/CheckinSlider.tsx` — custom animated slider
- `src/app/(app)/company/dashboard/page.tsx` — Admin dashboard mock (Prompt 0.4)
- `src/app/(app)/partners/page.tsx` — Partner discovery (Prompt 0.5)
- `src/components/partners/PartnerCard.tsx` — partner list card
- `src/app/(app)/level/page.tsx` — Level & gamification (Prompt 0.6)
- `src/components/level/LevelEmblem.tsx` — animated SVG level ring
- `src/app/(app)/profile/page.tsx` — stub (nav target)
- `src/app/(app)/company/teams/page.tsx` — stub
- `src/app/(app)/company/surveys/page.tsx` — stub
- `src/app/(app)/company/reports/page.tsx` — stub
- `src/app/(app)/company/settings/page.tsx` — stub
- `src/app/(app)/partner/profile/page.tsx` — stub
- `src/app/(app)/partner/offers/page.tsx` — stub
- `src/app/(app)/partner/reviews/page.tsx` — stub
- `src/app/(app)/partner/analytics/page.tsx` — stub

**Modified files:**
- `tailwind.config.ts` — add `amber` color scale (5 shades)
- `package.json` — add framer-motion, canvas-confetti (via npm install)

---

## Task 1: Dependencies & Amber Design Tokens

**Files:**
- Modify: `tailwind.config.ts`
- Run: `npm install framer-motion canvas-confetti`
- Run: `npm install --save-dev @types/canvas-confetti`

- [ ] **Step 1: Install Framer Motion and canvas-confetti**

```bash
cd /path/to/elyo-core
npm install framer-motion canvas-confetti
npm install --save-dev @types/canvas-confetti
```

Expected: packages added to `node_modules`, `package.json` updated with `"framer-motion"` and `"canvas-confetti"` in dependencies.

- [ ] **Step 2: Add amber color tokens to tailwind.config.ts**

Open `tailwind.config.ts`. In the `theme.extend.colors` object, add an `amber` scale after the `warm` block (before the shadcn color aliases):

```ts
amber: {
  50:  '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
},
```

- [ ] **Step 3: Verify Tailwind picks up the new tokens**

Run the dev server and confirm no build errors:

```bash
npm run dev
```

Expected: dev server starts, no Tailwind or TypeScript errors in the terminal.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts package.json package-lock.json
git commit -m "feat: add amber design tokens + framer-motion, canvas-confetti deps"
```

---

## Task 2: Shared UI Components — MetricChip, ScoreGauge, ProgressBar, LevelBadge

**Files:**
- Create: `src/components/ui/metric-chip.tsx`
- Create: `src/components/ui/score-gauge.tsx`
- Create: `src/components/ui/progress-bar.tsx`
- Create: `src/components/ui/level-badge.tsx`

These components are extracted as proper shared modules — currently ScoreGauge and MetricChip only exist inline in the real employee dashboard.

- [ ] **Step 1: Create MetricChip**

Create `src/components/ui/metric-chip.tsx`:

```tsx
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricChipProps {
  label: string
  value: number | string
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: string
  bg?: string
  className?: string
}

export function MetricChip({
  label,
  value,
  unit,
  trend,
  color = '#14b8a6',
  bg = '#f0fdf9',
  className,
}: MetricChipProps) {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div
      className={cn('flex flex-col gap-1 px-4 py-3 rounded-2xl', className)}
      style={{ background: bg }}
    >
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <div className="flex items-baseline gap-1">
        <span
          className="text-xl font-semibold"
          style={{ color, fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs font-normal text-gray-400">{unit}</span>
        )}
        {trend && (
          <TrendIcon
            className="w-3.5 h-3.5 ml-auto"
            style={{ color: trend === 'down' ? '#ef4444' : color }}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ScoreGauge**

Create `src/components/ui/score-gauge.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'

interface ScoreGaugeProps {
  score: number      // 0–100
  maxScore?: number  // default 100
  size?: number      // px, default 200
  strokeWidth?: number
  animate?: boolean
}

function gaugeColor(pct: number): string {
  if (pct >= 0.7) return '#14b8a6'
  if (pct >= 0.5) return '#f59e0b'
  return '#ef4444'
}

export function ScoreGauge({
  score,
  maxScore = 100,
  size = 200,
  strokeWidth = 12,
  animate = true,
}: ScoreGaugeProps) {
  const pct = Math.min(Math.max(score / maxScore, 0), 1)
  const [displayPct, setDisplayPct] = useState(animate ? 0 : pct)

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => setDisplayPct(pct), 50)
    return () => clearTimeout(timer)
  }, [pct, animate])

  const r = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  // 270° sweep (¾ of circle), starting from bottom-left (135°)
  const arcLength = circumference * 0.75
  const filled = displayPct * arcLength
  const color = gaugeColor(pct)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference * 0.25 + 1}`}
          strokeDashoffset={-(circumference * 0.125)}
          style={{ transform: 'rotate(135deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          strokeDashoffset={-(circumference * 0.125)}
          style={{
            transform: 'rotate(135deg)',
            transformOrigin: `${cx}px ${cy}px`,
            transition: animate ? 'stroke-dasharray 1s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold leading-none"
          style={{
            fontSize: size * 0.2,
            color,
            fontFamily: "'Fraunces', Georgia, serif",
          }}
        >
          {score}
        </span>
        <span className="text-xs font-medium text-gray-400 mt-1">/ {maxScore}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create ProgressBar**

Create `src/components/ui/progress-bar.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Milestone {
  value: number   // 0–100 as percentage
  label: string
}

interface ProgressBarProps {
  value: number   // 0–100
  label?: string
  sublabel?: string
  milestones?: Milestone[]
  color?: string
  animate?: boolean
  className?: string
}

export function ProgressBar({
  value,
  label,
  sublabel,
  milestones = [],
  color = '#14b8a6',
  animate = true,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100)
  const [width, setWidth] = useState(animate ? 0 : clamped)

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => setWidth(clamped), 100)
    return () => clearTimeout(timer)
  }, [clamped, animate])

  return (
    <div className={cn('space-y-2', className)}>
      {(label || sublabel) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
        </div>
      )}
      <div className="relative h-2.5 w-full rounded-full bg-gray-100">
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${width}%`,
            background: color,
            transition: animate ? 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s' : 'none',
          }}
        />
        {/* Milestone markers */}
        {milestones.map((m) => (
          <div
            key={m.value}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-4 rounded-full"
            style={{
              left: `${m.value}%`,
              background: clamped >= m.value ? color : '#d1d5db',
            }}
            title={m.label}
          />
        ))}
      </div>
      {milestones.length > 0 && (
        <div className="relative h-4">
          {milestones.map((m) => (
            <span
              key={m.value}
              className="absolute text-[10px] text-gray-400 -translate-x-1/2"
              style={{ left: `${m.value}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create LevelBadge**

Create `src/components/ui/level-badge.tsx`:

```tsx
import { cn } from '@/lib/utils'

export type Level = 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

const LEVEL_STYLES: Record<Level, { bg: string; text: string; border: string; label: string }> = {
  STARTER:  { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb',  label: 'Starter'  },
  BRONZE:   { bg: '#fef3c7', text: '#92400e', border: '#fde68a',  label: 'Bronze'   },
  SILVER:   { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1',  label: 'Silver'   },
  GOLD:     { bg: '#fffbeb', text: '#b45309', border: '#fcd34d',  label: 'Gold'     },
  PLATINUM: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe',  label: 'Platinum' },
}

interface LevelBadgeProps {
  level: Level
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  const style = LEVEL_STYLES[level]
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium tracking-wide',
        sizeClasses[size],
        className,
      )}
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      {style.label}
    </span>
  )
}
```

- [ ] **Step 5: Verify components compile**

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/metric-chip.tsx src/components/ui/score-gauge.tsx src/components/ui/progress-bar.tsx src/components/ui/level-badge.tsx
git commit -m "feat: add shared UI components — MetricChip, ScoreGauge, ProgressBar, LevelBadge"
```

---

## Task 3: RoleContext + AppShell + (app) Layout

**Files:**
- Create: `src/contexts/RoleContext.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/RoleSwitcher.tsx`
- Create: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create RoleContext**

Create `src/contexts/RoleContext.tsx`:

```tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type DemoRole = 'employee' | 'admin' | 'partner'

interface RoleContextValue {
  role: DemoRole
  setRole: (role: DemoRole) => void
}

const RoleContext = createContext<RoleContextValue>({
  role: 'employee',
  setRole: () => {},
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<DemoRole>('employee')
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
```

- [ ] **Step 2: Create AppShell**

Create `src/components/layout/AppShell.tsx`:

```tsx
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
  X,
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
```

- [ ] **Step 3: Create RoleSwitcher**

Create `src/components/layout/RoleSwitcher.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRole, type DemoRole } from '@/contexts/RoleContext'
import { useRouter } from 'next/navigation'

const ROLE_OPTIONS: { value: DemoRole; label: string; icon: string; defaultHref: string }[] = [
  { value: 'employee', label: 'Mitarbeiter',  icon: '👤', defaultHref: '/dashboard'         },
  { value: 'admin',    label: 'HR-Admin',     icon: '🏢', defaultHref: '/company/dashboard' },
  { value: 'partner',  label: 'Partner',      icon: '🤝', defaultHref: '/partner/profile'   },
]

export function RoleSwitcher() {
  const { role, setRole } = useRole()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleSelect(option: typeof ROLE_OPTIONS[0]) {
    setRole(option.value)
    setOpen(false)
    router.push(option.defaultHref)
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50">
      {open && (
        <div
          className="absolute bottom-14 right-0 mb-1 rounded-2xl shadow-card-lg overflow-hidden"
          style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)', minWidth: 180 }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'hsl(200, 15%, 88%)' }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Demo-Modus</p>
          </div>
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt)}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ color: role === opt.value ? '#14b8a6' : '#374151' }}
            >
              <span>{opt.icon}</span>
              {opt.label}
              {role === opt.value && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold shadow-card-md transition-all hover:shadow-card-lg"
        style={{ background: '#0a1f1c', color: '#5eead4' }}
        title="Rolle wechseln (Demo-Modus)"
      >
        🎭
        <span className="hidden sm:inline">Rolle wechseln</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Create (app) layout**

Create `src/app/(app)/layout.tsx`:

```tsx
import { RoleProvider } from '@/contexts/RoleContext'
import { AppShell } from '@/components/layout/AppShell'
import { RoleSwitcher } from '@/components/layout/RoleSwitcher'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <AppShell>
        {children}
      </AppShell>
      <RoleSwitcher />
    </RoleProvider>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. You should see the dark sidebar on the left with Employee navigation items, a "🎭 Rolle wechseln" button bottom-right. (The page content will 404/blank until Task 4.)

- [ ] **Step 7: Commit**

```bash
git add src/contexts/RoleContext.tsx src/components/layout/AppShell.tsx src/components/layout/RoleSwitcher.tsx src/app/\(app\)/layout.tsx
git commit -m "feat: RoleContext, AppShell with role-based nav, RoleSwitcher demo button"
```

---

## Task 4: Employee Dashboard Mockup (Prompt 0.2)

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create employee dashboard page**

Create `src/app/(app)/dashboard/page.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Flame, Zap, Smile, Users, ClipboardList } from 'lucide-react'
import { ScoreGauge } from '@/components/ui/score-gauge'
import { MetricChip } from '@/components/ui/metric-chip'
import { ProgressBar } from '@/components/ui/progress-bar'
import { LevelBadge } from '@/components/ui/level-badge'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

const MOCK_SCORE_HISTORY = [
  { day: 'Mo', score: 68 },
  { day: 'Di', score: 71 },
  { day: 'Mi', score: 65 },
  { day: 'Do', score: 74 },
  { day: 'Fr', score: 70 },
  { day: 'Sa', score: 72 },
  { day: 'So', score: 72 },
]

const MOCK_PARTNERS = [
  { name: 'Physiozentrum München',  type: 'Physiotherapie', dist: '1.2 km', rating: 4.9 },
  { name: 'YogaFlow Studio',        type: 'Bewegung',       dist: '2.8 km', rating: 4.7 },
  { name: 'Ernährungsberatung Koch',type: 'Ernährung',      dist: '3.4 km', rating: 4.8 },
]

const MOCK_SURVEYS = [
  { title: 'Quartalsbefragung Q2 2026',   minutes: 3 },
  { title: 'Ergonomie am Arbeitsplatz',   minutes: 2 },
]

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.08 } } },
  item:      { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } },
}

export default function EmployeeDashboardPage() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={stagger.container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={stagger.item} className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">Willkommen zurück</p>
          <h1
            className="text-3xl font-semibold text-gray-900 leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {greeting}, Sarah 👋
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xl">🔥</span>
            <span className="text-sm font-semibold text-gray-700">14 Tage Streak</span>
            <LevelBadge level="SILVER" size="sm" />
          </div>
        </div>
        <Link
          href="/checkin"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-glow"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          Check-in starten
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* Score hero */}
      <motion.div
        variants={stagger.item}
        className="rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6"
        style={{ background: 'linear-gradient(135deg, #f0fdf9 0%, #ffffff 60%)', border: '1px solid #d1fae5' }}
      >
        <ScoreGauge score={72} maxScore={100} size={180} />
        <div className="flex-1 space-y-4 w-full">
          <div>
            <p className="text-sm font-medium text-gray-400">Vitalitäts-Score</p>
            <p className="text-2xl font-semibold mt-0.5" style={{ color: '#14b8a6', fontFamily: "'Fraunces', Georgia, serif" }}>
              Gut
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricChip label="Energie"  value={7.2} unit="/10" color="#14b8a6" bg="#f0fdf9" />
            <MetricChip label="Stimmung" value={6.8} unit="/10" color="#4c8448" bg="#f2f7f4" />
            <MetricChip label="Belastung" value={4.1} unit="/10" color="#f59e0b" bg="#fffbeb" />
          </div>
          {/* Mini line chart */}
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_SCORE_HISTORY}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0a1f1c', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
                  formatter={(v: number) => [`${v}`, 'Score']}
                />
                <Line type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Level progress */}
      <motion.div
        variants={stagger.item}
        className="rounded-2xl p-5"
        style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LevelBadge level="SILVER" />
            <span className="text-sm font-semibold text-gray-700">Auf dem Weg zu Gold</span>
          </div>
          <span className="text-xs text-gray-400">65%</span>
        </div>
        <ProgressBar
          value={65}
          sublabel="Noch 35% bis GOLD"
          color="#f59e0b"
          milestones={[{ value: 100, label: 'Gold' }]}
        />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Kostenlose Erstberatung', locked: false },
            { label: '20% Rabatt Studios',      locked: false },
            { label: 'Bevorzugter Termin',      locked: false },
          ].map((p) => (
            <div
              key={p.label}
              className="flex items-start gap-2 p-2.5 rounded-xl text-xs"
              style={{ background: '#f0fdf9' }}
            >
              <span style={{ color: '#14b8a6' }}>✓</span>
              <span className="text-gray-600 leading-tight">{p.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl text-xs" style={{ background: '#fffbeb' }}>
          <span>🔒</span>
          <span className="text-gray-400">⚡ Fast Lane zu Experten — noch 35% bis GOLD</span>
        </div>
      </motion.div>

      {/* Partners carousel */}
      <motion.div variants={stagger.item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Partner in deiner Nähe</h2>
          <Link href="/partners" className="text-xs font-medium" style={{ color: '#14b8a6' }}>
            Alle anzeigen →
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {MOCK_PARTNERS.map((p) => (
            <div
              key={p.name}
              className="flex-shrink-0 w-52 rounded-2xl p-4 card-lift"
              style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}
            >
              <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style={{ background: '#f0fdf9' }}>
                <MapPin className="w-5 h-5" style={{ color: '#14b8a6' }} />
              </div>
              <p className="text-sm font-semibold text-gray-800 leading-tight mb-1">{p.name}</p>
              <p className="text-xs text-gray-400">{p.type} · {p.dist}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs font-semibold text-gray-700">⭐ {p.rating}</span>
                <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#f0fdf9', color: '#14b8a6' }}>
                  ELYO Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Open surveys */}
      <motion.div variants={stagger.item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            Offene Umfragen
          </h2>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ background: '#ef4444' }}
          >
            2
          </span>
        </div>
        <div className="space-y-2">
          {MOCK_SURVEYS.map((s) => (
            <div
              key={s.title}
              className="flex items-center justify-between p-4 rounded-2xl"
              style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">ca. {s.minutes} Minuten</p>
              </div>
              <button
                className="flex-shrink-0 text-sm font-semibold px-3 py-1.5 rounded-xl text-white"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                Jetzt ausfüllen
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
```

Note: The `MapPin` import above needs to be added at the top — it's already imported in the same block.

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Expected: full employee dashboard with score gauge animating in, partner carousel, level progress bar, and survey cards. Check on mobile width (< 768px) — bottom nav should appear.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: employee dashboard mockup with score gauge, level progress, partner carousel"
```

---

## Task 5: Check-in Flow (Prompt 0.3)

**Files:**
- Create: `src/components/checkin/CheckinSlider.tsx`
- Create: `src/app/(app)/checkin/page.tsx`

- [ ] **Step 1: Create CheckinSlider**

Create `src/components/checkin/CheckinSlider.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CheckinSliderProps {
  label: string
  iconLow: string
  iconHigh: string
  value: number
  onChange: (v: number) => void
  inverted?: boolean  // if true, high = bad (stress slider)
}

function sliderColor(value: number, inverted: boolean): string {
  const effective = inverted ? 11 - value : value
  if (effective >= 7) return '#14b8a6'
  if (effective >= 4) return '#f59e0b'
  return '#ef4444'
}

export function CheckinSlider({ label, iconLow, iconHigh, value, onChange, inverted = false }: CheckinSliderProps) {
  const color = sliderColor(value, inverted)
  const pct = ((value - 1) / 9) * 100

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span
          className="text-2xl font-bold transition-colors"
          style={{ color, fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {value}
        </span>
      </div>
      <div className="relative flex items-center gap-3">
        <span className="text-xl w-6 text-center">{iconLow}</span>
        <div className="relative flex-1 h-3 rounded-full" style={{ background: '#e5e7eb' }}>
          {/* Track fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full shadow-md flex items-center justify-center text-xs font-bold text-white transition-all"
            style={{ left: `${pct}%`, background: color }}
          >
            {value}
          </div>
          {/* Invisible native range input on top */}
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ zIndex: 10 }}
          />
        </div>
        <span className="text-xl w-6 text-center">{iconHigh}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create check-in page**

Create `src/app/(app)/checkin/page.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { CheckinSlider } from '@/components/checkin/CheckinSlider'

type Step = 1 | 2 | 3

const PLACEHOLDER_NOTES = [
  'Viel Meetings heute...',
  'Guter Start in den Tag',
  'Schlecht geschlafen...',
  'Produktiver Morgen!',
]

const slide = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:  { x: -60, opacity: 0, transition: { duration: 0.2 } },
}

function AnimatedCheck() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill="none" stroke="#d1fae5" strokeWidth="4" />
      <circle
        cx="40" cy="40" r="36"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="226"
        strokeDashoffset="226"
        style={{ animation: 'draw-circle 0.5s ease forwards' }}
      />
      <polyline
        points="24,40 36,52 56,30"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="60"
        strokeDashoffset="60"
        style={{ animation: 'draw-check 0.4s ease 0.45s forwards' }}
      />
      <style>{`
        @keyframes draw-circle { to { stroke-dashoffset: 0; } }
        @keyframes draw-check  { to { stroke-dashoffset: 0; } }
      `}</style>
    </svg>
  )
}

export default function CheckinPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [energy, setEnergy] = useState(7)
  const [mood, setMood] = useState(7)
  const [stress, setStress] = useState(3)
  const [note, setNote] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [scoreDisplayed, setScoreDisplayed] = useState(0)
  const confettiRef = useRef<HTMLCanvasElement>(null)

  const calculatedScore = Math.round(((energy + mood + (11 - stress)) / 30) * 100)

  useEffect(() => {
    if (step !== 3) return
    // Count-up animation
    let current = 0
    const interval = setInterval(() => {
      current += 2
      if (current >= calculatedScore) {
        setScoreDisplayed(calculatedScore)
        clearInterval(interval)
      } else {
        setScoreDisplayed(current)
      }
    }, 20)

    // Confetti
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#14b8a6', '#f59e0b', '#5eead4', '#fcd34d'] })
    })

    return () => clearInterval(interval)
  }, [step, calculatedScore])

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PLACEHOLDER_NOTES.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pb-24 lg:pb-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {([1, 2] as const).map((s) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: step >= s ? 32 : 12, background: step >= s ? '#14b8a6' : '#e5e7eb' }}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={slide} initial="enter" animate="center" exit="exit" className="space-y-8">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Wie geht's dir heute?
                </h1>
                <p className="text-sm text-gray-400 mt-1">Nur 3 Fragen — dauert 30 Sekunden</p>
              </div>

              <div
                className="rounded-3xl p-6 space-y-8"
                style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}
              >
                <CheckinSlider label="Energie"  iconLow="🪫" iconHigh="⚡" value={energy} onChange={setEnergy} />
                <CheckinSlider label="Stimmung" iconLow="😔" iconHigh="😄" value={mood}   onChange={setMood}   />
                <CheckinSlider label="Belastung" iconLow="😌" iconHigh="🔥" value={stress} onChange={setStress} inverted />
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all hover:shadow-glow"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                Weiter →
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={slide} initial="enter" animate="center" exit="exit" className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Optionale Notiz
                </h1>
                <p className="text-sm text-gray-400 mt-1">Was beschäftigt dich heute?</p>
              </div>

              <div className="rounded-3xl p-5" style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}>
                <textarea
                  rows={5}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={PLACEHOLDER_NOTES[placeholderIdx]}
                  className="w-full resize-none text-sm text-gray-700 outline-none placeholder-gray-300"
                  style={{ background: 'transparent' }}
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setStep(3)}
                  className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all hover:shadow-glow"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                >
                  Check-in abschließen
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="w-full py-2 text-sm font-medium text-gray-400 hover:text-gray-600"
                >
                  Überspringen →
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.4 } }}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">
                <AnimatedCheck />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Check-in gespeichert! 🎉
                </h1>
                <p className="text-sm text-gray-400 mt-2">Deine Daten sind anonym und sicher.</p>
              </div>

              <div
                className="rounded-3xl p-6"
                style={{ background: 'linear-gradient(135deg, #f0fdf9, #ffffff)', border: '1px solid #d1fae5' }}
              >
                <p className="text-xs font-medium text-gray-400 mb-1">Dein Score heute</p>
                <p
                  className="text-5xl font-bold"
                  style={{ color: '#14b8a6', fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {scoreDisplayed}
                </p>
                <p className="text-sm text-gray-400 mt-1">/100</p>
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm font-semibold text-gray-700">15 Tage Streak — weiter so!</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                Zum Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify check-in flow in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/checkin`. Walk through all 3 steps:
- Step 1: all three sliders should change color as you drag
- Step 2: placeholder text in textarea rotates every 3 seconds
- Step 3: checkmark animates, confetti fires, score counts up

- [ ] **Step 4: Commit**

```bash
git add src/components/checkin/CheckinSlider.tsx src/app/\(app\)/checkin/page.tsx
git commit -m "feat: 3-step check-in flow with animated sliders, confetti, score count-up"
```

---

## Task 6: Company Admin Dashboard Mockup (Prompt 0.4)

**Files:**
- Create: `src/app/(app)/company/dashboard/page.tsx`

- [ ] **Step 1: Create admin dashboard page**

Create `src/app/(app)/company/dashboard/page.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Download, Users, Zap, TrendingDown, TrendingUp, ClipboardList, UserPlus, BarChart2 } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { MetricChip } from '@/components/ui/metric-chip'

const TREND_DATA = [
  { week: 'KW1',  vi: 68 }, { week: 'KW2',  vi: 70 }, { week: 'KW3',  vi: 69 },
  { week: 'KW4',  vi: 71 }, { week: 'KW5',  vi: 72 }, { week: 'KW6',  vi: 70 },
  { week: 'KW7',  vi: 73 }, { week: 'KW8',  vi: 72 }, { week: 'KW9',  vi: 74 },
  { week: 'KW10', vi: 71 }, { week: 'KW11', vi: 73 }, { week: 'KW12', vi: 71 },
]

const TEAMS = [
  { name: 'Marketing',        members: 18, active: 16, vi: 76, trend: 'up'      },
  { name: 'IT / Entwicklung', members: 12, active: 9,  vi: 62, trend: 'neutral' },
  { name: 'Vertrieb',         members: 34, active: 28, vi: 74, trend: 'up'      },
  { name: 'Produktion – H3',  members: 34, active: 25, vi: 48, trend: 'up'      },
  { name: 'HR & Verwaltung',  members: 8,  active: 8,  vi: 81, trend: 'up'      },
  { name: 'Logistik',         members: 22, active: 17, vi: 70, trend: 'neutral' },
]

const AT_RISK = [
  { name: 'Produktion – Halle 3', belastung: 8.2, members: 34, trend: '↑' },
  { name: 'IT / Entwicklung',     belastung: 7.8, members: 12, trend: '→' },
]

function viColor(vi: number) {
  if (vi >= 70) return '#14b8a6'
  if (vi >= 55) return '#f59e0b'
  return '#ef4444'
}

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } },
}

export default function CompanyDashboardPage() {
  return (
    <motion.div className="space-y-6 pb-8" variants={stagger.container} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={stagger.item} className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Unternehmensportal</p>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Müller Maschinenbau GmbH
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">347 Mitarbeiter · Letzter ESG-Export: vor 3 Tagen</p>
        </div>
        <button
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
          style={{ background: '#f0fdf9', color: '#0d9488', border: '1px solid #d1fae5' }}
        >
          <Download className="w-4 h-4" />
          ESG-Export
        </button>
      </motion.div>

      {/* KPI tiles */}
      <motion.div variants={stagger.item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Vitalitäts-Index', value: '71', unit: '/100', trend: '+3 vs. Vormonat', color: '#14b8a6', bg: '#f0fdf9', trendUp: true },
          { label: 'Aktive Nutzer',    value: '218', unit: '/347', trend: '63% Aktivierungsrate', color: '#4c8448', bg: '#f2f7f4', trendUp: true },
          { label: 'Ø Energie',        value: '6.8', unit: '/10',  trend: 'Diese Woche',  color: '#f59e0b', bg: '#fffbeb', trendUp: null },
          { label: 'Krankheitstage',   value: '24',  unit: '/Mo',  trend: '↓8% vs. Vormonat', color: '#14b8a6', bg: '#f0fdf9', trendUp: true },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl p-4" style={{ background: kpi.bg }}>
            <p className="text-xs font-medium text-gray-400 mb-1">{kpi.label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: kpi.color, fontFamily: "'Fraunces', Georgia, serif" }}>
                {kpi.value}
              </span>
              <span className="text-xs text-gray-400">{kpi.unit}</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              {kpi.trendUp !== null && (
                kpi.trendUp
                  ? <TrendingUp className="w-3 h-3" style={{ color: '#14b8a6' }} />
                  : <TrendingDown className="w-3 h-3" style={{ color: '#ef4444' }} />
              )}
              <span className="text-[10px] text-gray-400">{kpi.trend}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* At-risk radar */}
      <motion.div
        variants={stagger.item}
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid #fecaca' }}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#fff5f5' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
            2 Teams zeigen erhöhte Belastungsindikatoren
          </p>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'white' }}>
          {AT_RISK.map((team) => (
            <div key={team.name} className="flex items-center justify-between gap-4 p-3 rounded-xl" style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
              <div>
                <p className="text-sm font-semibold text-gray-800">{team.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Belastungs-Index: <span className="font-semibold" style={{ color: '#ef4444' }}>{team.belastung}/10</span>
                  {' '}· {team.members} Mitglieder · Trend {team.trend}
                </p>
              </div>
              <button
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl"
                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
              >
                Maßnahme vorschlagen
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-400 px-1">
            Alle Werte sind anonymisiert. Individualdaten sind nicht einsehbar.
          </p>
        </div>
      </motion.div>

      {/* Trend chart */}
      <motion.div variants={stagger.item} className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Vitalitäts-Index – letzte 12 Wochen</h2>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={TREND_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 85]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: '#0a1f1c', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
                formatter={(v: number) => [`${v}`, 'VI']}
              />
              <Line type="monotone" dataKey="vi" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 3, fill: '#14b8a6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Team health table */}
      <motion.div variants={stagger.item} className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(200, 15%, 88%)' }}>
          <h2 className="text-sm font-semibold text-gray-700">Team-Health Übersicht</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Team', 'Mitglieder', 'Aktiv', 'VI', 'Trend', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAMS.map((team, i) => (
                <tr key={team.name} style={{ borderTop: i > 0 ? '1px solid hsl(200, 15%, 93%)' : 'none' }}>
                  <td className="px-4 py-3 pl-5 font-medium text-gray-800">{team.name}</td>
                  <td className="px-4 py-3 text-gray-500">{team.members}</td>
                  <td className="px-4 py-3 text-gray-500">{team.active}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold" style={{ color: viColor(team.vi) }}>{team.vi}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {team.trend === 'up' ? '↑' : team.trend === 'down' ? '↓' : '→'}
                  </td>
                  <td className="px-4 py-3 pr-5">
                    <button className="text-xs font-medium" style={{ color: '#14b8a6' }}>Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t" style={{ background: '#f9fafb', borderColor: 'hsl(200, 15%, 88%)' }}>
          <p className="text-xs text-gray-400">
            Alle Analysen basieren auf anonymisierten Aggregatdaten (min. 5 Einträge)
          </p>
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={stagger.item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Download,     label: 'ESG-Report (CSV)',     color: '#14b8a6', bg: '#f0fdf9' },
          { icon: ClipboardList,label: 'Neue Umfrage',         color: '#4c8448', bg: '#f2f7f4' },
          { icon: UserPlus,     label: 'Mitarbeiter einladen', color: '#f59e0b', bg: '#fffbeb' },
          { icon: BarChart2,    label: 'Maßnahmen-Hub',        color: '#6d28d9', bg: '#f5f3ff' },
        ].map(({ icon: Icon, label, color, bg }) => (
          <button
            key={label}
            className="flex items-center gap-3 p-3.5 rounded-2xl text-sm font-medium card-lift text-left"
            style={{ background: bg }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
            <span style={{ color: color === '#f59e0b' ? '#92400e' : color === '#6d28d9' ? '#5b21b6' : color }}>{label}</span>
          </button>
        ))}
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Switch to Admin role via RoleSwitcher (🎭) and you should land on `/company/dashboard`. Check:
- 4 KPI tiles with trend indicators
- Red at-risk banner with 2 team cards
- Line chart (12 weeks)
- Team health table with color-coded VI scores
- Quick action buttons

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/company/dashboard/page.tsx
git commit -m "feat: company admin dashboard mockup with at-risk radar, trend chart, team table"
```

---

## Task 7: Partner Map & Discovery (Prompt 0.5)

**Files:**
- Create: `src/components/partners/PartnerCard.tsx`
- Create: `src/app/(app)/partners/page.tsx`

- [ ] **Step 1: Create PartnerCard**

Create `src/components/partners/PartnerCard.tsx`:

```tsx
import { MapPin, Star, Wifi, Lock } from 'lucide-react'
import { LevelBadge, type Level } from '@/components/ui/level-badge'
import { cn } from '@/lib/utils'

export interface Partner {
  name: string
  type: string
  distance: string | 'digital'
  rating: number
  verified: boolean
  minLevel: Level | 'all'
  currentLevel: Level
  fastLane?: boolean
  goldSlots?: boolean
  pending?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  Physiotherapie: '#14b8a6',
  Bewegung:       '#4c8448',
  Präventivmedizin:'#6d28d9',
  'Mental Health': '#ec4899',
  Ernährung:      '#f59e0b',
  Fitness:        '#ef4444',
  MSK:            '#3b82f6',
  Schlaf:         '#8b5cf6',
}

const LEVEL_ORDER: Level[] = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']

function isUnlocked(current: Level, required: Level | 'all'): boolean {
  if (required === 'all') return true
  return LEVEL_ORDER.indexOf(current) >= LEVEL_ORDER.indexOf(required)
}

export function PartnerCard({ partner, onClick }: { partner: Partner; onClick?: () => void }) {
  const unlocked = isUnlocked(partner.currentLevel, partner.minLevel)
  const color = CATEGORY_COLORS[partner.type] ?? '#14b8a6'

  return (
    <div
      onClick={onClick}
      className={cn('flex items-start gap-4 p-4 rounded-2xl card-lift cursor-pointer', !unlocked && 'opacity-70')}
      style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}
    >
      {/* Category stripe */}
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />

      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
        {partner.distance === 'digital'
          ? <Wifi className="w-5 h-5" style={{ color }} />
          : <MapPin className="w-5 h-5" style={{ color }} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-800 leading-tight">{partner.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {partner.type} ·{' '}
              {partner.distance === 'digital' ? '🌐 Digital' : `📍 ${partner.distance}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {partner.minLevel !== 'all'
              ? <LevelBadge level={partner.minLevel} size="sm" />
              : <span className="text-[10px] text-gray-400 font-medium">Für alle</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-gray-700">{partner.rating}</span>
          </div>
          {partner.verified && !partner.pending && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: '#f0fdf9', color: '#0d9488' }}
            >
              ELYO Verified
            </span>
          )}
          {partner.pending && (
            <span className="text-[10px] font-medium text-gray-400 px-1.5 py-0.5 rounded-full bg-gray-100">
              In Prüfung
            </span>
          )}
          {partner.fastLane && unlocked && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-auto"
              style={{ background: '#fffbeb', color: '#b45309' }}
            >
              ⚡ Heute verfügbar
            </span>
          )}
        </div>

        <div className="mt-3">
          {unlocked ? (
            <button
              className="w-full py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Vorteil nutzen
            </button>
          ) : (
            <button
              className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
              style={{ background: '#f3f4f6', color: '#9ca3af' }}
              disabled
            >
              <Lock className="w-3 h-3" />
              Ab {partner.minLevel} verfügbar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create partners page**

Create `src/app/(app)/partners/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PartnerCard, type Partner } from '@/components/partners/PartnerCard'
import { LevelBadge } from '@/components/ui/level-badge'

const CURRENT_LEVEL = 'SILVER' as const

const MOCK_PARTNERS: Partner[] = [
  { name: 'Physiozentrum München Ost', type: 'Physiotherapie',  distance: '1.2 km',  rating: 4.9, verified: true,  minLevel: 'all',    currentLevel: CURRENT_LEVEL, goldSlots: true  },
  { name: 'YogaFlow Studio',           type: 'Bewegung',        distance: '2.8 km',  rating: 4.7, verified: true,  minLevel: 'all',    currentLevel: CURRENT_LEVEL                   },
  { name: 'Dr. med. Anna Berger',      type: 'Präventivmedizin',distance: '0.8 km',  rating: 5.0, verified: true,  minLevel: 'GOLD',   currentLevel: CURRENT_LEVEL, fastLane: true    },
  { name: 'MindfulNess Online',        type: 'Mental Health',   distance: 'digital', rating: 4.6, verified: true,  minLevel: 'SILVER', currentLevel: CURRENT_LEVEL                   },
  { name: 'Ernährungsberatung Koch',   type: 'Ernährung',       distance: '3.4 km',  rating: 4.8, verified: true,  minLevel: 'BRONZE', currentLevel: CURRENT_LEVEL                   },
  { name: 'FitnessFabrik',             type: 'Fitness',         distance: '1.9 km',  rating: 4.5, verified: true,  minLevel: 'SILVER', currentLevel: CURRENT_LEVEL                   },
  { name: 'Rücken-Coach Online',       type: 'MSK',             distance: 'digital', rating: 4.7, verified: true,  minLevel: 'all',    currentLevel: CURRENT_LEVEL                   },
  { name: 'Schlafcoaching Müller',     type: 'Schlaf',          distance: 'digital', rating: 4.6, verified: false, minLevel: 'all',    currentLevel: CURRENT_LEVEL, pending: true     },
]

const CATEGORIES = ['Alle', 'Physiotherapie', 'Fitness', 'Mental Health', 'Ernährung', 'Schlaf', 'MSK']
type Tab = 'alle' | 'nahe' | 'digital' | 'vorteile'

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

export default function PartnersPage() {
  const [tab, setTab]         = useState<Tab>('alle')
  const [category, setCategory] = useState('Alle')

  const filtered = MOCK_PARTNERS.filter((p) => {
    if (tab === 'nahe'    && p.distance === 'digital') return false
    if (tab === 'digital' && p.distance !== 'digital') return false
    if (tab === 'vorteile') {
      const order = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']
      const unlocked = p.minLevel === 'all' || order.indexOf(CURRENT_LEVEL) >= order.indexOf(p.minLevel)
      if (!unlocked) return false
    }
    if (category !== 'Alle' && p.type !== category) return false
    return true
  })

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Partner-Netzwerk
        </h1>
        <p className="text-sm text-gray-400 mt-1">Kuratierte Angebote für dein Wohlbefinden</p>
      </div>

      {/* Hero — level benefits */}
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #f0fdf9, #ffffff)', border: '1px solid #d1fae5' }}>
        <div className="flex items-center gap-2 mb-3">
          <LevelBadge level="SILVER" />
          <span className="text-sm font-semibold text-gray-700">3 Vorteile für dein Level verfügbar</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Erstberatung Ernährung', sublabel: 'Kostenlos' },
            { label: '20% Rabatt Studios',     sublabel: 'Bei 3 Partnern' },
            { label: 'Bevorzugter Termin',     sublabel: '24h statt 48h' },
          ].map((v) => (
            <div key={v.label} className="rounded-xl p-2.5" style={{ background: 'white', border: '1px solid #d1fae5' }}>
              <p className="text-xs font-semibold text-gray-700 leading-tight">{v.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{v.sublabel}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
        {(['alle', 'nahe', 'digital', 'vorteile'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={tab === t ? { background: 'white', color: '#14b8a6', boxShadow: '0 1px 3px rgb(0,0,0,0.07)' } : { color: '#6b7280' }}
          >
            {t === 'alle' ? 'Alle' : t === 'nahe' ? 'In der Nähe' : t === 'digital' ? 'Digital' : 'Meine Vorteile'}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={category === c
              ? { background: '#14b8a6', color: 'white' }
              : { background: '#f3f4f6', color: '#6b7280' }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Partner list */}
      <motion.div
        className="space-y-3"
        variants={stagger.container}
        initial="hidden"
        animate="show"
        key={tab + category}
      >
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Keine Partner gefunden.</div>
        ) : (
          filtered.map((p) => (
            <motion.div key={p.name} variants={stagger.item}>
              <PartnerCard partner={p} />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Static map placeholder */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid hsl(200, 15%, 88%)', height: 200, background: '#f0fdf9', position: 'relative' }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
          <span className="text-3xl">🗺️</span>
          <p className="text-sm font-medium">Interaktive Karte (Phase 2)</p>
          <p className="text-xs">8 Partner in München Ost</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/partners`. Check:
- Tab switching filters the list
- Category chips filter
- "Meine Vorteile" tab shows only unlocked partners
- Locked partners show lock icon and disabled button
- GOLD-only partner (Dr. Berger) is locked at SILVER

- [ ] **Step 4: Commit**

```bash
git add src/components/partners/PartnerCard.tsx src/app/\(app\)/partners/page.tsx
git commit -m "feat: partner discovery with filter tabs, category chips, level-gated access"
```

---

## Task 8: Level & Gamification (Prompt 0.6)

**Files:**
- Create: `src/components/level/LevelEmblem.tsx`
- Create: `src/app/(app)/level/page.tsx`

- [ ] **Step 1: Create LevelEmblem**

Create `src/components/level/LevelEmblem.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { type Level } from '@/components/ui/level-badge'

const LEVEL_COLORS: Record<Level, { primary: string; secondary: string; glow: string }> = {
  STARTER:  { primary: '#9ca3af', secondary: '#d1d5db', glow: 'rgba(156,163,175,0.3)' },
  BRONZE:   { primary: '#b45309', secondary: '#f59e0b', glow: 'rgba(180,83,9,0.3)'   },
  SILVER:   { primary: '#64748b', secondary: '#cbd5e1', glow: 'rgba(100,116,139,0.4)' },
  GOLD:     { primary: '#b45309', secondary: '#fcd34d', glow: 'rgba(251,191,36,0.4)'  },
  PLATINUM: { primary: '#7c3aed', secondary: '#ddd6fe', glow: 'rgba(124,58,237,0.4)'  },
}

interface LevelEmblemProps {
  level: Level
  progress: number  // 0–100
  size?: number
}

export function LevelEmblem({ level, progress, size = 160 }: LevelEmblemProps) {
  const [displayed, setDisplayed] = useState(0)
  const colors = LEVEL_COLORS[level]
  const r = (size - 16) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const arcFill = (displayed / 100) * circumference

  useEffect(() => {
    const t = setTimeout(() => setDisplayed(progress), 100)
    return () => clearTimeout(t)
  }, [progress])

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          animation: 'float 3s ease-in-out infinite',
        }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        {/* Progress ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={colors.secondary}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${arcFill} ${circumference}`}
          strokeDashoffset={circumference * 0.25}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
          }}
        />
        {/* Inner hexagon */}
        <polygon
          points={hexagonPoints(cx, cy, r * 0.6)}
          fill={colors.primary}
          opacity="0.15"
        />
        <polygon
          points={hexagonPoints(cx, cy, r * 0.6)}
          fill="none"
          stroke={colors.primary}
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Level initial */}
        <text
          x={cx} y={cy + 6}
          textAnchor="middle"
          className="font-display"
          style={{
            fill: colors.primary,
            fontSize: size * 0.2,
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 600,
          }}
        >
          {level[0]}
        </text>
      </svg>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}

function hexagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
}
```

- [ ] **Step 2: Create level page**

Create `src/app/(app)/level/page.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import { LevelEmblem } from '@/components/level/LevelEmblem'
import { LevelBadge, type Level } from '@/components/ui/level-badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Check, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

const LEVEL_TIMELINE: {
  level: Level
  status: 'done' | 'current' | 'locked'
  privileges: { label: string; locked: boolean }[]
}[] = [
  {
    level: 'STARTER',
    status: 'done',
    privileges: [
      { label: 'Zugang zum ELYO-Portal',        locked: false },
      { label: 'Täglicher Check-in',             locked: false },
    ],
  },
  {
    level: 'BRONZE',
    status: 'done',
    privileges: [
      { label: 'Kostenlose Erstberatung Ernährung', locked: false },
      { label: 'Zugang zu ELYO-Webinaren',          locked: false },
    ],
  },
  {
    level: 'SILVER',
    status: 'current',
    privileges: [
      { label: '20% Rabatt bei Partner-Studios',      locked: false },
      { label: 'Bevorzugter Terminzugang (24h)',       locked: false },
      { label: 'Team-Challenge starten',               locked: false },
    ],
  },
  {
    level: 'GOLD',
    status: 'locked',
    privileges: [
      { label: '⚡ Fast Lane: Direkte Termine bei Top-Experten', locked: true },
      { label: 'Kostenlose Coaching-Session (1x/Quartal)',       locked: true },
      { label: 'Persönlicher Vitalitäts-Jahresbericht',         locked: true },
    ],
  },
  {
    level: 'PLATINUM',
    status: 'locked',
    privileges: [
      { label: 'Beta-Features frühzeitig testen', locked: true },
      { label: 'Ambassador-Status',               locked: true },
      { label: 'Versicherungsvorteile (in Entwicklung)', locked: true },
    ],
  },
]

const POINT_ACTIVITIES = [
  { icon: '🔥', label: 'Täglicher Check-in',         pts: '+2 Punkte' },
  { icon: '📊', label: 'Umfrage ausfüllen',           pts: '+5 Punkte' },
  { icon: '⌚', label: 'Wearable-Sync aktiv',         pts: '+1 Punkt/Tag' },
  { icon: '📋', label: 'Anamnese vervollständigen',   pts: 'bis zu +20 Punkte' },
  { icon: '⭐', label: 'Partner bewerten',            pts: '+3 Punkte' },
]

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

export default function LevelPage() {
  const [expanded, setExpanded] = useState<Level | null>('SILVER')

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={stagger.container}
      initial="hidden"
      animate="show"
    >
      {/* Level hero */}
      <motion.div
        variants={stagger.item}
        className="rounded-3xl p-8 text-center"
        style={{ background: 'linear-gradient(135deg, #f0fdf9 0%, #ffffff 60%)', border: '1px solid #d1fae5' }}
      >
        <div className="flex justify-center mb-4">
          <LevelEmblem level="SILVER" progress={72} size={160} />
        </div>
        <h1
          className="text-2xl font-semibold text-gray-900"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Sarah – Level SILVER
        </h1>
        <p className="text-sm text-gray-400 mt-1">Seit 47 Tagen dabei</p>

        <div className="mt-6 max-w-xs mx-auto">
          <ProgressBar
            value={72}
            label="Fortschritt zu GOLD"
            sublabel="72/100 Punkte"
            color="#f59e0b"
          />
        </div>

        {/* What's missing */}
        <div className="mt-5 grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {[
            { label: 'Streak 30+ Tage', progress: '14/30', done: false },
            { label: 'Wearable verbunden', progress: 'Erledigt', done: true },
            { label: 'Anamnese 100%', progress: '80%', done: false },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-2.5 text-center"
              style={{ background: item.done ? '#f0fdf9' : '#fffbeb', border: `1px solid ${item.done ? '#d1fae5' : '#fde68a'}` }}
            >
              <p className="text-[10px] font-medium text-gray-600 leading-tight">{item.label}</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: item.done ? '#14b8a6' : '#b45309' }}>
                {item.progress}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/profile"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl"
          style={{ background: '#fffbeb', color: '#b45309' }}
        >
          Anamnese vervollständigen → 28 Punkte erhalten
        </Link>
      </motion.div>

      {/* Level timeline */}
      <motion.div variants={stagger.item}>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Alle Level</h2>
        <div className="space-y-2">
          {LEVEL_TIMELINE.map(({ level, status, privileges }) => (
            <div
              key={level}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'white', border: `1px solid ${status === 'current' ? '#a7f3d0' : 'hsl(200, 15%, 88%)'}` }}
            >
              <button
                onClick={() => setExpanded(expanded === level ? null : level)}
                className="flex w-full items-center gap-3 px-4 py-3.5"
              >
                {/* Status icon */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: status === 'done' ? '#f0fdf9' : status === 'current' ? '#14b8a6' : '#f3f4f6',
                  }}
                >
                  {status === 'done'    && <Check className="w-3.5 h-3.5" style={{ color: '#14b8a6' }} />}
                  {status === 'current' && <span className="text-white text-xs font-bold">●</span>}
                  {status === 'locked'  && <Lock className="w-3 h-3 text-gray-300" />}
                </div>

                <LevelBadge level={level} size={status === 'current' ? 'md' : 'sm'} />
                {status === 'current' && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: '#f0fdf9', color: '#14b8a6' }}
                  >
                    Aktuell
                  </span>
                )}

                <div className="ml-auto">
                  {expanded === level
                    ? <ChevronUp className="w-4 h-4 text-gray-300" />
                    : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </div>
              </button>

              {expanded === level && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: 'hsl(200, 15%, 93%)' }}>
                  <div className="mt-3 space-y-2">
                    {privileges.map((p) => (
                      <div key={p.label} className="flex items-center gap-2.5 text-sm">
                        {p.locked
                          ? <Lock className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" />
                          : <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#14b8a6' }} />}
                        <span className={p.locked ? 'text-gray-400' : 'text-gray-700'}>
                          {p.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Activity log */}
      <motion.div variants={stagger.item} className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid hsl(200, 15%, 88%)' }}>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Wie du Punkte sammelst</h2>
        <div className="space-y-2.5">
          {POINT_ACTIVITIES.map((a) => (
            <div key={a.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{a.icon}</span>
                <span className="text-sm text-gray-700">{a.label}</span>
              </div>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{ background: '#f0fdf9', color: '#0d9488' }}
              >
                {a.pts}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/level`. Check:
- Silver emblem with hexagonal ring that animates on load
- Progress bar fills with amber color
- "Missing" chips show streak, wearable, anamnesis status
- Level timeline accordion — Silver is expanded by default
- Check icons on unlocked privileges, lock icons on locked ones
- Points log at bottom

- [ ] **Step 4: Commit**

```bash
git add src/components/level/LevelEmblem.tsx src/app/\(app\)/level/page.tsx
git commit -m "feat: level & gamification page with animated emblem, timeline accordion, point log"
```

---

## Task 9: Navigation Stubs + Role Switcher Wiring (Prompt 0.7)

**Files:**
- Create: `src/app/(app)/profile/page.tsx`
- Create: `src/app/(app)/company/teams/page.tsx`
- Create: `src/app/(app)/company/surveys/page.tsx`
- Create: `src/app/(app)/company/reports/page.tsx`
- Create: `src/app/(app)/company/settings/page.tsx`
- Create: `src/app/(app)/partner/profile/page.tsx`
- Create: `src/app/(app)/partner/offers/page.tsx`
- Create: `src/app/(app)/partner/reviews/page.tsx`
- Create: `src/app/(app)/partner/analytics/page.tsx`

- [ ] **Step 1: Create stub helper**

All stub pages follow the same pattern. Create each one:

`src/app/(app)/profile/page.tsx`:
```tsx
export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
      <span className="text-4xl">👤</span>
      <h1 className="text-xl font-semibold text-gray-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Mein Profil</h1>
      <p className="text-sm text-gray-400">Wird in Phase 1 implementiert</p>
    </div>
  )
}
```

`src/app/(app)/company/teams/page.tsx`:
```tsx
export default function TeamsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
      <span className="text-4xl">👥</span>
      <h1 className="text-xl font-semibold text-gray-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Teams</h1>
      <p className="text-sm text-gray-400">Wird in Phase 1 implementiert</p>
    </div>
  )
}
```

`src/app/(app)/company/surveys/page.tsx`:
```tsx
export default function SurveysPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
      <span className="text-4xl">📋</span>
      <h1 className="text-xl font-semibold text-gray-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Umfragen</h1>
      <p className="text-sm text-gray-400">Wird in Phase 1 implementiert</p>
    </div>
  )
}
```

`src/app/(app)/company/reports/page.tsx`:
```tsx
export default function ReportsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
      <span className="text-4xl">📊</span>
      <h1 className="text-xl font-semibold text-gray-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Berichte</h1>
      <p className="text-sm text-gray-400">Wird in Phase 1 implementiert</p>
    </div>
  )
}
```

`src/app/(app)/company/settings/page.tsx`:
```tsx
export default function CompanySettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
      <span className="text-4xl">⚙️</span>
      <h1 className="text-xl font-semibold text-gray-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Einstellungen</h1>
      <p className="text-sm text-gray-400">Wird in Phase 1 implementiert</p>
    </div>
  )
}
```

`src/app/(app)/partner/profile/page.tsx`:
```tsx
export default function PartnerProfilePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
      <span className="text-4xl">🤝</span>
      <h1 className="text-xl font-semibold text-gray-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Partner-Portal</h1>
      <p className="text-sm text-gray-400">Mein Profil &amp; Angebote – wird in Phase 2 implementiert</p>
    </div>
  )
}
```

`src/app/(app)/partner/offers/page.tsx`:
```tsx
export default function PartnerOffersPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
      <span className="text-4xl">📦</span>
      <h1 className="text-xl font-semibold text-gray-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Meine Angebote</h1>
      <p className="text-sm text-gray-400">Wird in Phase 2 implementiert</p>
    </div>
  )
}
```

`src/app/(app)/partner/reviews/page.tsx`:
```tsx
export default function PartnerReviewsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
      <span className="text-4xl">⭐</span>
      <h1 className="text-xl font-semibold text-gray-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Bewertungen</h1>
      <p className="text-sm text-gray-400">Wird in Phase 2 implementiert</p>
    </div>
  )
}
```

`src/app/(app)/partner/analytics/page.tsx`:
```tsx
export default function PartnerAnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
      <span className="text-4xl">📈</span>
      <h1 className="text-xl font-semibold text-gray-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Analytics</h1>
      <p className="text-sm text-gray-400">Wird in Phase 2 implementiert</p>
    </div>
  )
}
```

- [ ] **Step 2: Add Demo badge to root layout**

Modify `src/app/layout.tsx` to add a visible "Demo" watermark (helps distinguish from production):

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";

export const metadata: Metadata = {
  title: "ELYO — Employee Wellbeing",
  description: "Employee Wellbeing Platform — anonym, sicher, menschlich.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

(No change needed — the Demo badge is already in the RoleSwitcher component.)

- [ ] **Step 3: End-to-end test — all role navigation**

```bash
npm run dev
```

Walk through all three roles:

**Employee (default):**
- `/dashboard` → score gauge, partner carousel, level card, surveys ✓
- `/checkin` → 3-step flow works end-to-end ✓
- `/partners` → filter tabs work, level gating works ✓
- `/level` → emblem animates, accordion works ✓
- `/profile` → stub page ✓

**Switch to Admin (🎭 → HR-Admin):**
- `/company/dashboard` → KPIs, at-risk radar, trend chart, team table ✓
- `/company/teams` → stub ✓
- `/company/surveys` → stub ✓
- `/company/reports` → stub ✓
- `/company/settings` → stub ✓

**Switch to Partner (🎭 → Partner):**
- `/partner/profile` → stub ✓
- `/partner/offers` → stub ✓
- `/partner/reviews` → stub ✓
- `/partner/analytics` → stub ✓

Check on mobile (< 768px): bottom nav visible, desktop sidebar hidden, hamburger menu works.

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before committing.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/profile/page.tsx \
        src/app/\(app\)/company/teams/page.tsx \
        src/app/\(app\)/company/surveys/page.tsx \
        src/app/\(app\)/company/reports/page.tsx \
        src/app/\(app\)/company/settings/page.tsx \
        src/app/\(app\)/partner/profile/page.tsx \
        src/app/\(app\)/partner/offers/page.tsx \
        src/app/\(app\)/partner/reviews/page.tsx \
        src/app/\(app\)/partner/analytics/page.tsx
git commit -m "feat: Phase 0 complete — all nav stubs added, full role switching demo ready"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Prompt 0.1: tailwind.config amber tokens, AppShell (sidebar + mobile nav), Button/Card/Badge/MetricChip/ScoreGauge/ProgressBar components, layout.tsx with fonts
- ✅ Prompt 0.2: Employee dashboard with score gauge, 7-day chart, level card, partner carousel, surveys
- ✅ Prompt 0.3: 3-step check-in with custom sliders, note step, confetti + animated checkmark completion
- ✅ Prompt 0.4: Admin dashboard with KPI tiles, at-risk radar, 12-week trend chart, team table, quick actions
- ✅ Prompt 0.5: Partner list with filter tabs, category chips, level gating, partner cards, map placeholder
- ✅ Prompt 0.6: Level page with animated emblem, progress ring, accordion timeline, points log
- ✅ Prompt 0.7: RoleSwitcher, all nav routes wired, skeleton stubs for Phase 2 items

**Type consistency:**
- `Level` type is defined in `level-badge.tsx` and re-exported/imported consistently
- `DemoRole` type defined in `RoleContext.tsx` and used in `AppShell.tsx` and `RoleSwitcher.tsx`
- `Partner` interface defined in `PartnerCard.tsx` and used in `partners/page.tsx`
- `ScoreGauge` props: `score` (0–100), `maxScore` (default 100) — used correctly in dashboard (score=72, maxScore=100)

**No placeholders:** All steps contain complete code. No TBD or TODO.
