import type { Metadata, Viewport } from 'next'
import { siteConfig } from '@/lib/config'
import './globals.css'

const description = `Register as a genuine member of ${siteConfig.orgName} so the admin can confirm who is who in the community.`

export const metadata: Metadata = {
  title: `Member Registry | ${siteConfig.orgName}`,
  description,
  openGraph: { title: `Member Registry | ${siteConfig.orgName}`, description },
}

export const viewport: Viewport = { themeColor: '#16303B', colorScheme: 'light' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-NG"><body>{children}</body></html>
}
