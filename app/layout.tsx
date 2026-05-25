import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

export const metadata: Metadata = {
  title: 'Timetask — Team Task Manager',
  description: 'Organize work and move faster with Timetask — the all-in-one task and team management platform.',
  keywords: ['task management', 'team collaboration', 'project management'],
  openGraph: {
    title: 'Timetask',
    description: 'The all-in-one task and team management platform.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}