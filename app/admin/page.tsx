'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { nigeriaStates } from '@/lib/nigeria-lgas'

type Registration = {
  id: string
  code: string
  fullName: string
  phone: string
  email: string
  address: string
  state: string
  lga: string
  status: 'pending' | 'verified' | 'rejected'
  adminNotes: string | null
  createdAt: string
  verifiedAt: string | null
  adminNotifiedAt: string | null
}

type Counts = {
  pending: number
  verified: number
  rejected: number
  total: number
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return iso
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [items, setItems] = useState<Registration[]>([])
  const [counts, setCounts] = useState<Counts>({ pending: 0, verified: 0, rejected: 0, total: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [statusFilter, setStatusFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (stateFilter !== 'all') params.set('state', stateFilter)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const res = await fetch(`/api/admin/registrations?${params.toString()}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }

      if (!res.ok) {
        throw new Error('Failed to load registrations.')
      }

      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
      if (data.counts) setCounts(data.counts)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'An error occurred loading records.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, stateFilter, page, pageSize, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleSignOut() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      router.push('/admin/login')
      router.refresh()
    }
  }

  const exportUrl = `/api/admin/export?${new URLSearchParams({
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(stateFilter !== 'all' ? { state: stateFilter } : {}),
  }).toString()}`

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/" className="admin-brand">
          Tina Like Minds <span>Registry</span>
        </Link>
        <div className="admin-header-actions">
          <span className="admin-access-label">Administrator workspace</span>
          <button type="button" className="admin-signin-link" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">Member registry</p>
            <h1>Registrations</h1>
            <p>Review and verify member submissions in one secure workspace.</p>
          </div>
          <a className="admin-export-button" href={exportUrl} download>
            Export CSV
          </a>
        </div>

        <div className="admin-metrics" aria-label="Registration totals">
          <article className="admin-metric">
            <span>Total registrations</span>
            <strong>{counts.total}</strong>
          </article>
          <article className="admin-metric">
            <span>Pending review</span>
            <strong>{counts.pending}</strong>
          </article>
          <article className="admin-metric">
            <span>Verified</span>
            <strong>{counts.verified}</strong>
          </article>
          <article className="admin-metric">
            <span>Rejected</span>
            <strong>{counts.rejected}</strong>
          </article>
        </div>

        <section className="admin-list-card" aria-label="Registration list">
          <div className="admin-toolbar">
            <label className="admin-search">
              Search registrations
              <input
                type="search"
                placeholder="Search name, phone, email or code"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
            <label className="admin-filter">
              Status
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="admin-filter">
              State
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All states</option>
                {nigeriaStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div className="form-error" role="alert" style={{ margin: '16px' }}>
              <span>{error}</span>
              <button type="button" className="outline-button retry-button" onClick={loadData}>
                Try again
              </button>
            </div>
          )}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>State / LGA</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="admin-empty-cell">
                      Loading registrations…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-empty-cell">
                      No registration records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/admin/registrations/${row.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong style={{ fontFamily: 'monospace' }}>{row.code}</strong>
                      </td>
                      <td>{row.fullName}</td>
                      <td>{row.phone}</td>
                      <td>
                        {row.state} / {row.lga}
                      </td>
                      <td>
                        <span className={`status-pill status-${row.status}`}>
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </span>
                      </td>
                      <td>{formatDate(row.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <span>
              Showing {items.length} of {total} records (Page {page} of {totalPages})
            </span>
            <div>
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
