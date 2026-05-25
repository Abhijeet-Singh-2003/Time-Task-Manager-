'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Navbar from '@/components/Navbar'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#070711',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            border: '3px solid rgba(124,58,237,0.2)',
            borderTop: '3px solid #7c3aed',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'rgba(150,145,200,0.6)', fontSize: '14px' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#070711' }}>
      <Navbar />
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
