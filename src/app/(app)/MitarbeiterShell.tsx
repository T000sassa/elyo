'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import styles from './shell.module.css'

const NAV_MEIN_TAG = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/checkin',   label: 'Täglicher Check-in', badge: '•' },
  { href: '/partners',  label: 'Partner in der Nähe' },
  { href: '/level',     label: 'Level & Vorteile' },
]

const NAV_MEIN_PROFIL = [
  { href: '/profile/anamnesis',     label: 'Anamnese' },
  { href: '/profile/data-sources',  label: 'Datenquellen' },
  { href: '/profile/notifications', label: 'Benachrichtigungen' },
  { href: '/profile',               label: 'Einstellungen' },
]

function getHeaderTitle(pathname: string): { main: string; sub: string } {
  if (pathname === '/dashboard')                      return { main: 'Dashboard', sub: '· Dein Tag im Überblick' }
  if (pathname.startsWith('/checkin'))                return { main: 'Täglicher Check-in', sub: '· Wie geht es dir heute?' }
  if (pathname.startsWith('/partners'))               return { main: 'Partner in der Nähe', sub: '· Geprüfte Gesundheitsangebote' }
  if (pathname.startsWith('/level'))                  return { main: 'Level & Vorteile', sub: '· Deine Fortschritte' }
  if (pathname.startsWith('/profile/anamnesis'))      return { main: 'Anamnese', sub: '· Dein Gesundheitsprofil' }
  if (pathname.startsWith('/profile/data-sources'))   return { main: 'Datenquellen', sub: '· Verbundene Geräte' }
  if (pathname.startsWith('/profile/notifications'))  return { main: 'Benachrichtigungen', sub: '· Deine Einstellungen' }
  if (pathname.startsWith('/profile'))                return { main: 'Einstellungen', sub: '· Dein Profil' }
  return { main: 'ELYO', sub: '' }
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/profile') {
    // exact match only for /profile to avoid matching /profile/anamnesis etc as "Einstellungen"
    return pathname === '/profile'
  }
  if (href === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname === href || pathname.startsWith(href + '/')
}

export function MitarbeiterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Mitarbeiter'
  const initials = userName
    .split(' ')
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const { main: headerMain, sub: headerSub } = getHeaderTitle(pathname)

  return (
    <>
      {/* Rollen-Leiste */}
      <div className={styles['role-switch']}>
        <div className={styles['role-switch-inner']}>
          <span className={styles['role-switch-label']}>◆ ELYO Demo-Modus</span>
          <span style={{ color: 'rgba(237,229,208,0.5)' }}>Oberflächen-Vorschau · Phase 0</span>
          <div className={styles['role-switch-links']}>
            <a href="#">Unternehmen</a>
            <a href="#" className={styles['active']}>Mitarbeiter</a>
            <a href="#">Partner-Login</a>
          </div>
        </div>
      </div>

      <div className={styles['app']}>

        {/* ============ SIDEBAR ============ */}
        <aside className={styles['sidebar']}>
          <div className={styles['logo']}>
            <div className={styles['logo-mark']}>E</div>
            <div className={styles['logo-name']}>elyo</div>
          </div>

          <div className={styles['nav-section-label']}>Mein Tag</div>

          <Link
            href="/dashboard"
            className={`${styles['nav-item']}${isNavActive(pathname, '/dashboard') ? ` ${styles['active']}` : ''}`}
          >
            <svg className={styles['icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12l2-2 7-7 7 7 2 2M5 10v10a1 1 0 001 1h3v-6a1 1 0 011-1h4a1 1 0 011 1v6h3a1 1 0 001-1V10" />
            </svg>
            Dashboard
          </Link>

          <Link
            href="/checkin"
            className={`${styles['nav-item']}${isNavActive(pathname, '/checkin') ? ` ${styles['active']}` : ''}`}
          >
            <svg className={styles['icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            Täglicher Check-in
            <span className={styles['badge']}>•</span>
          </Link>

          <Link
            href="/partners"
            className={`${styles['nav-item']}${isNavActive(pathname, '/partners') ? ` ${styles['active']}` : ''}`}
          >
            <svg className={styles['icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Partner in der Nähe
          </Link>

          <Link
            href="/level"
            className={`${styles['nav-item']}${isNavActive(pathname, '/level') ? ` ${styles['active']}` : ''}`}
          >
            <svg className={styles['icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
            </svg>
            Level &amp; Vorteile
          </Link>

          <div className={styles['nav-section-label']}>Mein Profil</div>

          <Link
            href="/profile/anamnesis"
            className={`${styles['nav-item']}${isNavActive(pathname, '/profile/anamnesis') ? ` ${styles['active']}` : ''}`}
          >
            <svg className={styles['icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Anamnese
          </Link>

          <Link
            href="/profile/data-sources"
            className={`${styles['nav-item']}${isNavActive(pathname, '/profile/data-sources') ? ` ${styles['active']}` : ''}`}
          >
            <svg className={styles['icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="2" width="12" height="20" rx="3" />
              <path d="M10 20h4" />
            </svg>
            Datenquellen
          </Link>

          <Link
            href="/profile/notifications"
            className={`${styles['nav-item']}${isNavActive(pathname, '/profile/notifications') ? ` ${styles['active']}` : ''}`}
          >
            <svg className={styles['icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11H5a2 2 0 00-2 2v5a2 2 0 002 2h4m0-9h6a2 2 0 012 2v5a2 2 0 01-2 2h-4m-2-9v-6a3 3 0 016 0v6" />
            </svg>
            Benachrichtigungen
          </Link>

          <Link
            href="/profile"
            className={`${styles['nav-item']}${isNavActive(pathname, '/profile') ? ` ${styles['active']}` : ''}`}
          >
            <svg className={styles['icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Einstellungen
          </Link>

          <div className={styles['sidebar-foot']}>
            <strong>🔒 Deine Daten</strong>
            Kein Arbeitgeber sieht deine Einzelwerte. Immer.
          </div>
        </aside>

        {/* ============ MAIN ============ */}
        <main className={styles['main']}>

          {/* HEADER */}
          <div className={styles['header']}>
            <div>
              <div className={styles['header-title']}>
                {headerMain}
                {headerSub && <span> {headerSub}</span>}
              </div>
            </div>
            <div className={styles['header-spacer']}></div>
            <div className={styles['icon-btn']}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
              </svg>
              <span className={styles['dot']}></span>
            </div>
            <div className={styles['avatar']}>
              <div className={styles['avatar-img']}>{initials || 'MA'}</div>
              <div className={styles['avatar-meta']}>
                <div className={styles['avatar-name']}>{userName}</div>
                <div className={styles['avatar-role']}>
                  <span className={`${styles['level-badge']} ${styles['silver']}`}>◆ Silver</span>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className={styles['content']}>
            {children}
          </div>

        </main>
      </div>
    </>
  )
}
