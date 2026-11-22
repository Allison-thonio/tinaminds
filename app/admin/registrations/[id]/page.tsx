'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d) + ' (WAT)'
  } catch {
    return iso
  }
}

export default function RegistrationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [record, setRecord] = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxTitle, setLightboxTitle] = useState('')

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmCodeInput, setConfirmCodeInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/registrations/${id}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      if (!res.ok) {
        throw new Error('Could not load record.')
      }
      const data = (await res.json()) as Registration
      setRecord(data)
      setNotes(data.adminNotes || '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error loading record.')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  async function copyText(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // ignore
    }
  }

  async function updateStatus(nextStatus: 'pending' | 'verified' | 'rejected') {
    setUpdatingStatus(true)
    setActionMessage('')
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status.')
      setActionMessage(`Status updated to ${nextStatus}.`)
      await loadRecord()
    } catch (cause) {
      setActionMessage(cause instanceof Error ? cause.message : 'Failed to update status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function saveNotes() {
    setSavingNotes(true)
    setActionMessage('')
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: notes }),
      })
      if (!res.ok) throw new Error('Failed to save notes.')
      setActionMessage('Admin notes saved.')
      await loadRecord()
    } catch (cause) {
      setActionMessage(cause instanceof Error ? cause.message : 'Failed to save notes.')
    } finally {
      setSavingNotes(false)
    }
  }

  async function resendEmail() {
    setResendingEmail(true)
    setActionMessage('')
    try {
      const res = await fetch(`/api/admin/registrations/${id}/resend`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to resend admin notification email.')
      setActionMessage('Admin notification email resent successfully.')
      await loadRecord()
    } catch (cause) {
      setActionMessage(cause instanceof Error ? cause.message : 'Failed to resend email.')
    } finally {
      setResendingEmail(false)
    }
  }

  async function handleDelete() {
    if (!record || confirmCodeInput !== record.code) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/registrations/${id}?confirm=true`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete record.')
      router.push('/admin')
      router.refresh()
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'Failed to delete record.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="admin-page">
        <header className="admin-header">
          <Link href="/admin" className="admin-brand">
            Tina Like Minds <span>Registry</span>
          </Link>
        </header>
        <div className="admin-content">
          <p style={{ padding: '32px 0' }}>Loading record details…</p>
        </div>
      </main>
    )
  }

  if (error || !record) {
    return (
      <main className="admin-page">
        <header className="admin-header">
          <Link href="/admin" className="admin-brand">
            Tina Like Minds <span>Registry</span>
          </Link>
        </header>
        <div className="admin-content">
          <Link className="admin-text-link admin-back-link" href="/admin">
            ← All registrations
          </Link>
          <div className="form-error" role="alert" style={{ marginTop: '24px' }}>
            <span>{error || 'Record not found.'}</span>
          </div>
        </div>
      </main>
    )
  }

  const voterCardUrl = `/api/admin/registrations/${id}/files/voter-card`
  const photoUrl = `/api/admin/registrations/${id}/files/photo`

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/admin" className="admin-brand">
          Tina Like Minds <span>Registry</span>
        </Link>
        <Link className="admin-signin-link" href="/admin">
          Dashboard
        </Link>
      </header>

      <div className="admin-content">
        <Link className="admin-text-link admin-back-link" href="/admin">
          ← All registrations
        </Link>

        <div className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">Registration Detail</p>
            <h1>{record.fullName}</h1>
            <p>
              Code: <strong style={{ fontFamily: 'monospace' }}>{record.code}</strong> · Status:{' '}
              <span className={`status-pill status-${record.status}`}>{record.status.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {actionMessage && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: '20px',
              borderRadius: '6px',
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              fontSize: '14px',
            }}
          >
            {actionMessage}
          </div>
        )}

        <div className="admin-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Left Column: Details & Actions */}
          <div className="admin-detail-card" style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e5e5ea' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Member Information</h2>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', lineHeight: 1.8 }}>
              <tbody>
                <tr>
                  <td style={{ color: '#636366', width: '35%' }}>Code</td>
                  <td>
                    <strong style={{ fontFamily: 'monospace' }}>{record.code}</strong>
                    <button
                      type="button"
                      style={{ marginLeft: '8px', fontSize: '12px', padding: '2px 8px' }}
                      className="outline-button"
                      onClick={() => copyText(record.code, 'code')}
                    >
                      {copiedField === 'code' ? 'Copied' : 'Copy'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#636366' }}>Full Name</td>
                  <td><strong>{record.fullName}</strong></td>
                </tr>
                <tr>
                  <td style={{ color: '#636366' }}>Phone</td>
                  <td>
                    <a href={`tel:${record.phone}`} style={{ color: '#0b6e4f', textDecoration: 'none' }}>
                      {record.phone}
                    </a>
                    <button
                      type="button"
                      style={{ marginLeft: '8px', fontSize: '12px', padding: '2px 8px' }}
                      className="outline-button"
                      onClick={() => copyText(record.phone, 'phone')}
                    >
                      {copiedField === 'phone' ? 'Copied' : 'Copy'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#636366' }}>Email</td>
                  <td>
                    {record.email}
                    <button
                      type="button"
                      style={{ marginLeft: '8px', fontSize: '12px', padding: '2px 8px' }}
                      className="outline-button"
                      onClick={() => copyText(record.email, 'email')}
                    >
                      {copiedField === 'email' ? 'Copied' : 'Copy'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#636366' }}>Home Address</td>
                  <td>{record.address}</td>
                </tr>
                <tr>
                  <td style={{ color: '#636366' }}>State &amp; LGA</td>
                  <td>{record.state} · {record.lga}</td>
                </tr>
                <tr>
                  <td style={{ color: '#636366' }}>Registered</td>
                  <td>{formatDate(record.createdAt)}</td>
                </tr>
                <tr>
                  <td style={{ color: '#636366' }}>Verified At</td>
                  <td>{formatDate(record.verifiedAt)}</td>
                </tr>
                <tr>
                  <td style={{ color: '#636366' }}>Admin Email Sent</td>
                  <td>{record.adminNotifiedAt ? formatDate(record.adminNotifiedAt) : 'Not sent'}</td>
                </tr>
              </tbody>
            </table>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e5ea', margin: '20px 0' }} />

            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Review Decision</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <button
                type="button"
                className="submit-button"
                disabled={updatingStatus || record.status === 'verified'}
                onClick={() => updateStatus('verified')}
                style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32' }}
              >
                Mark Verified
              </button>
              <button
                type="button"
                className="submit-button"
                disabled={updatingStatus || record.status === 'rejected'}
                onClick={() => updateStatus('rejected')}
                style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}
              >
                Reject
              </button>
              <button
                type="button"
                className="outline-button"
                disabled={updatingStatus || record.status === 'pending'}
                onClick={() => updateStatus('pending')}
              >
                Set Pending
              </button>
            </div>

            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Admin Notes</h3>
            <textarea
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes (max 500 chars)"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="outline-button"
                disabled={savingNotes}
                onClick={saveNotes}
              >
                {savingNotes ? 'Saving…' : 'Save notes'}
              </button>
              <span style={{ fontSize: '12px', color: '#8e8e93' }}>{notes.length}/500</span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e5ea', margin: '24px 0 16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <button
                type="button"
                className="outline-button"
                disabled={resendingEmail}
                onClick={resendEmail}
              >
                {resendingEmail ? 'Sending…' : 'Resend admin email'}
              </button>
              <button
                type="button"
                className="outline-button"
                style={{ color: '#c62828', borderColor: '#c62828' }}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete record
              </button>
            </div>
          </div>

          {/* Right Column: Uploaded Documents */}
          <div className="admin-detail-card" style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e5e5ea' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Uploaded Documents</h2>
            <p style={{ fontSize: '13px', color: '#636366', marginBottom: '16px' }}>
              Click any image to enlarge with lightbox zoom. Files are served via 60-second secure signed URLs.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>Voter’s Card (PVC)</h3>
              <div
                style={{
                  border: '1px solid #e5e5ea',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: '#f2f2f7',
                  textAlign: 'center',
                }}
                onClick={() => {
                  setLightboxUrl(voterCardUrl)
                  setLightboxTitle("Voter's Card (PVC)")
                }}
              >
                <img
                  src={voterCardUrl}
                  alt="Voter's card preview"
                  style={{ maxHeight: '240px', width: 'auto', maxWidth: '100%', margin: '0 auto', display: 'block' }}
                />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>Photograph</h3>
              <div
                style={{
                  border: '1px solid #e5e5ea',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: '#f2f2f7',
                  textAlign: 'center',
                }}
                onClick={() => {
                  setLightboxUrl(photoUrl)
                  setLightboxTitle('Member Photograph')
                }}
              >
                <img
                  src={photoUrl}
                  alt="Member photograph preview"
                  style={{ maxHeight: '240px', width: 'auto', maxWidth: '100%', margin: '0 auto', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setLightboxUrl(null)}
        >
          <div
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: '#fff', marginBottom: '12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>{lightboxTitle}</span>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕ Close
              </button>
            </div>
            <img
              src={lightboxUrl}
              alt={lightboxTitle}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '4px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '440px',
              width: '100%',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#c62828', marginBottom: '12px' }}>
              Confirm Record Deletion
            </h3>
            <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#3a3a3c', marginBottom: '16px' }}>
              This will permanently delete this registration record and remove both uploaded photos from private storage.
              This action cannot be undone.
            </p>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>
              Please type the registration code <strong>{record.code}</strong> to confirm:
            </p>
            <input
              type="text"
              value={confirmCodeInput}
              onChange={(e) => setConfirmCodeInput(e.target.value.trim().toUpperCase())}
              placeholder={record.code}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontFamily: 'monospace',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="outline-button"
                disabled={deleting}
                onClick={() => {
                  setShowDeleteModal(false)
                  setConfirmCodeInput('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="submit-button"
                disabled={confirmCodeInput !== record.code || deleting}
                style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}
                onClick={handleDelete}
              >
                {deleting ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
