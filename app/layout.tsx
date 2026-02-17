import React from "react"
import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { AuthProvider } from '@/components/auth/auth-provider'
import './globals.css'

const _spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: '--font-sans' });
const _jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'StudyRx | HOSA Competitive Events Prep',
  description: 'Master HOSA competitive events with intelligent practice sessions, detailed analytics, and performance tracking designed for healthcare excellence.',
  keywords: ['HOSA', 'competitive events', 'healthcare', 'practice', 'medical terminology', 'research', 'medical education'],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
