'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = '520px' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'fadeUp 0.2s ease forwards',
      }}
    >
      <div
        className="animate-scale-in"
        style={{
          background: '#13121f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '18px',
          width: '100%',
          maxWidth,
          boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f0eeff' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', width: '30px', height: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(160,155,210,0.7)', cursor: 'pointer', transition: 'all .15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.target as HTMLButtonElement).style.color = '#f0eeff' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.target as HTMLButtonElement).style.color = 'rgba(160,155,210,0.7)' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
