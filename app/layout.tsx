import type { Metadata, Viewport } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import { siteConfig } from '@/lib/config'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
})

const description = `Register as a genuine member of ${siteConfig.orgName} so the admin can confirm who is who in the community.`

export const metadata: Metadata = {
  title: `Member Registry | ${siteConfig.orgName}`,
  description,
  openGraph: { title: `Member Registry | ${siteConfig.orgName}`, description },
}

export const viewport: Viewport = { themeColor: '#16303B', colorScheme: 'light' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  )
}
