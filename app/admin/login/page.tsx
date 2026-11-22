'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [visible, setVisible] = useState(false)

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const result = (await response.json()) as { ok?: boolean; error?: { message?: string } }
      if (!response.ok || !result.ok) {
        setMessage(result.error?.message ?? 'Incorrect password.')
      } else {
        router.push('/admin')
        router.refresh()
      }
    } catch {
      setMessage('Admin sign-in is currently unavailable.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-login-page">
      <Link href="/" className="admin-back-link">
        ← Tina Like Minds registry
      </Link>
      <section className="admin-login-card">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img
            src="/images/logo.png"
            alt="Tina Like Minds logo"
            width={64}
            height={64}
            style={{ borderRadius: 14, display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
        <span className="admin-eyebrow">Secure area</span>
        <h1>Admin sign-in</h1>
        <p className="admin-login-description">Sign in to review member registrations.</p>
        <form onSubmit={signIn}>
          <label className="admin-password" htmlFor="admin-password">
            Password
          </label>
          <div className="admin-password-control">
            <input
              id="admin-password"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              aria-label={visible ? 'Hide password' : 'Show password'}
              aria-pressed={visible}
              onClick={() => setVisible((value) => !value)}
            >
              {visible ? 'Hide' : 'Show'}
            </button>
          </div>
          {message && (
            <p className="form-error" role="alert">
              {message}
            </p>
          )}
          <button className="admin-login-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
