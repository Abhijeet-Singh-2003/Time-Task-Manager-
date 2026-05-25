'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'

const navLinks = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3.5l2 2H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
      </svg>
    ),
  },
  {
    href: '/tasks',
    label: 'Tasks',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
      </svg>
    ),
  },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <aside style={{
      width: '236px',
      minWidth: '236px',
      height: '100vh',
      background: '#0d0c18',
      borderRight: '1px solid rgba(255,255,255,0.055)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px 20px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
          flexShrink: 0,
        }}>
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: '17px', color: '#f0eeff', letterSpacing: '-0.3px' }}>
          Timetask
        </span>
      </div>

      <hr className="divider" style={{ marginBottom: '8px' }} />

      {/* Nav links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-item${active ? ' active' : ''}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div>
        <hr className="divider" style={{ marginBottom: '12px' }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 10px', borderRadius: '10px',
        }}>
          {/* Avatar */}
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e5ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(150,145,200,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="btn-ghost"
          style={{ width: '100%', marginTop: '4px', justifyContent: 'flex-start', fontSize: '13px' }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
