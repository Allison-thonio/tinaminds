import Link from 'next/link'
import { siteConfig } from '@/lib/config'
export default function NotFound() { return <main className="not-found"><span className="eyebrow dark-eyebrow">{siteConfig.orgShortName}</span><h1>We couldn&apos;t find that page.</h1><p>The page may have moved, or the address may be incorrect.</p><Link href="/" className="gold-button">Return to the registry <span aria-hidden="true">↗</span></Link></main> }
