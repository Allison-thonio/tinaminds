'use client'
import { useEffect } from 'react'
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[registry] Page rendering error', error.digest) }, [error])
  return <main className="not-found"><span className="eyebrow dark-eyebrow">Tina Like Minds</span><h1>Something went wrong.</h1><p>Please try again. Your information has not been submitted unless you saw a confirmation.</p><button className="gold-button" onClick={reset}>Try again <span aria-hidden="true">↻</span></button></main>
}
