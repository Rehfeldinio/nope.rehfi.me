import type { Metadata } from 'next'
import { Geist } from 'next/font/google'

import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rehfeldinio',
  description: 'Zeichne was du willst. Sterne, Schnee, Feuerwerk inklusive.',
  icons: {
    icon: '/images/deer.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${geist.className} antialiased`}>{children}</body>
    </html>
  )
}
