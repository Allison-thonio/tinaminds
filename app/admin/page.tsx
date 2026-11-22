'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { nigeriaStates } from '@/lib/nigeria-lgas'
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Download,
  LogOut,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

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
      hour: '2-digit',
      minute: '2-digit',
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

      if (!res.ok) throw new Error('Failed to load registrations.')

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
      {/* Header */}
      <header className="admin-header">
        <Link href="/" className="admin-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <img src="/images/logo.png" alt="Tina Like Minds Logo" width={32} height={32} style={{ borderRadius: 6, objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <span>Tina Like Minds <span>Registry Admin</span></span>
        </Link>
        <div className="admin-header-actions">
          <span className="admin-access-label">
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981', marginRight: 6 }}></span>
            Connected &amp; Secure
          </span>
          <button
            type="button"
            className="admin-signin-link"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleSignOut}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <div className="admin-content">
        {/* Page Title & Export Bar */}
        <div className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">Member Registry</p>
            <h1>Registrations Overview</h1>
            <p style={{ color: '#636366', marginTop: 4 }}>
              Review, match, and verify member identity submissions against the WhatsApp community.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="admin-export-button"
              onClick={loadData}
              title="Refresh list"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <a
              className="admin-export-button"
              href={exportUrl}
              download
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16303B', color: '#fff', borderColor: '#16303B' }}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Metric Stat Cards */}
        <div className="admin-metrics">
          <div
            className="admin-metric"
            style={{ cursor: 'pointer', borderLeft: statusFilter === 'all' ? '4px solid #16303B' : undefined }}
            onClick={() => { setStatusFilter('all'); setPage(1) }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Total Registrations</span>
              <Users size={18} color="#636366" />
            </div>
            <strong>{counts.total}</strong>
          </div>

          <div
            className="admin-metric"
            style={{ cursor: 'pointer', borderLeft: '4px solid #f59e0b', background: statusFilter === 'pending' ? '#fefce8' : '#fff' }}
            onClick={() => { setStatusFilter('pending'); setPage(1) }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#b45309' }}>Pending Review</span>
              <Clock size={18} color="#f59e0b" />
            </div>
            <strong style={{ color: '#b45309' }}>{counts.pending}</strong>
          </div>

          <div
            className="admin-metric"
            style={{ cursor: 'pointer', borderLeft: '4px solid #10b981', background: statusFilter === 'verified' ? '#f0fdf4' : '#fff' }}
            onClick={() => { setStatusFilter('verified'); setPage(1) }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#047857' }}>Verified Members</span>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
            <strong style={{ color: '#047857' }}>{counts.verified}</strong>
          </div>

          <div
            className="admin-metric"
            style={{ cursor: 'pointer', borderLeft: '4px solid #ef4444', background: statusFilter === 'rejected' ? '#fef2f2' : '#fff' }}
            onClick={() => { setStatusFilter('rejected'); setPage(1) }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#b91c1c' }}>Rejected</span>
              <XCircle size={18} color="#ef4444" />
            </div>
            <strong style={{ color: '#b91c1c' }}>{counts.rejected}</strong>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <section className="admin-list-card">
          <div className="admin-toolbar" style={{ flexWrap: 'wrap' }}>
            <label className="admin-search" style={{ minWidth: 260 }}>
              <span>Search Member Records</span>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#8e8e93' }} />
                <input
                  type="search"
                  placeholder="Search name, phone (+234...), email or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </label>

            <label className="admin-filter" style={{ minWidth: 160 }}>
              <span>Status Filter</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All statuses ({counts.total})</option>
                <option value="pending">Pending ({counts.pending})</option>
                <option value="verified">Verified ({counts.verified})</option>
                <option value="rejected">Rejected ({counts.rejected})</option>
              </select>
            </label>

            <label className="admin-filter" style={{ minWidth: 180 }}>
              <span>State Filter</span>
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All States</option>
                {nigeriaStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>

            {(debouncedSearch || statusFilter !== 'all' || stateFilter !== 'all') && (
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setStateFilter('all')
                  setPage(1)
                }}
                style={{ height: 42, padding: '0 14px', fontSize: 13, alignSelf: 'flex-end' }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {error && (
            <div className="form-error" role="alert" style={{ margin: '16px 20px' }}>
              <span>{error}</span>
              <button type="button" className="outline-button retry-button" onClick={loadData}>
                Try again
              </button>
            </div>
          )}

          {/* Table */}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Member Code</th>
                  <th>Full Name</th>
                  <th>Phone Number</th>
                  <th>State &amp; LGA</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="admin-empty-cell" style={{ padding: 48, textAlign: 'center' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#16303B' }} />
                      <p>Loading registrations…</p>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-empty-cell" style={{ padding: 48, textAlign: 'center' }}>
                      <p style={{ fontWeight: 600, color: '#1c1c1e', marginBottom: 4 }}>No registration records found.</p>
                      <p style={{ color: '#8e8e93', fontSize: 13 }}>
                        Try adjusting your search query or filters above.
                      </p>
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
                        <strong
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 14,
                            background: '#f1f5f9',
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid #e2e8f0',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {row.code}
                        </strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: '#16303B',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {row.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{row.fullName}</span>
                            <br />
                            <small style={{ color: '#64748b' }}>{row.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <a
                          href={`tel:${row.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#0b6e4f', fontWeight: 600, textDecoration: 'none' }}
                        >
                          {row.phone}
                        </a>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{row.state}</span>
                        <br />
                        <small style={{ color: '#64748b' }}>{row.lga}</small>
                      </td>
                      <td>
                        <span className={`status-pill status-${row.status}`}>
                          {row.status === 'verified' && <CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                          {row.status === 'pending' && <Clock size={12} style={{ marginRight: 4 }} />}
                          {row.status === 'rejected' && <XCircle size={12} style={{ marginRight: 4 }} />}
                          {row.status}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{formatDate(row.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: '#16303B',
                            fontWeight: 600,
                            fontSize: 13,
                          }}
                        >
                          Review <ChevronRight size={14} />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="admin-pagination">
            <span>
              Showing <strong>{items.length}</strong> of <strong>{total}</strong> records · Page {page} of {totalPages}
            </span>
            <div>
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
