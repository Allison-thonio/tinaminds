'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Send,
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

const QUICK_NOTES = [
  'Verified & matched in WhatsApp group',
  'Face matches Voter’s Card photograph',
  'Voter’s Card image blurry or unreadable',
  'Phone number not found in WhatsApp community',
  'Duplicate submission under different name',
]

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
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxTitle, setLightboxTitle] = useState('')
  const [zoomScale, setZoomScale] = useState(1)
  const [rotation, setRotation] = useState(0)

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
      if (!res.ok) throw new Error('Could not load member record.')
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
    setActionMessage(null)
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status.')
      setActionMessage({
        text: nextStatus === 'verified' ? 'Member successfully marked as VERIFIED.' : `Status updated to ${nextStatus.toUpperCase()}.`,
        type: 'success',
      })
      await loadRecord()
    } catch (cause) {
      setActionMessage({
        text: cause instanceof Error ? cause.message : 'Failed to update status.',
        type: 'error',
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function saveNotes() {
    setSavingNotes(true)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: notes }),
      })
      if (!res.ok) throw new Error('Failed to save notes.')
      setActionMessage({ text: 'Admin notes saved.', type: 'success' })
      await loadRecord()
    } catch (cause) {
      setActionMessage({
        text: cause instanceof Error ? cause.message : 'Failed to save notes.',
        type: 'error',
      })
    } finally {
      setSavingNotes(false)
    }
  }

  async function resendEmail() {
    setResendingEmail(true)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/admin/registrations/${id}/resend`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to resend admin notification email.')
      setActionMessage({ text: 'Admin notification email resent successfully.', type: 'success' })
      await loadRecord()
    } catch (cause) {
      setActionMessage({
        text: cause instanceof Error ? cause.message : 'Failed to resend email.',
        type: 'error',
      })
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

  function openLightbox(url: string, title: string) {
    setLightboxUrl(url)
    setLightboxTitle(title)
    setZoomScale(1)
    setRotation(0)
  }

  if (loading) {
    return (
      <main className="admin-page">
        <header className="admin-header">
          <Link href="/admin" className="admin-brand">
            Tina Like Minds <span>Registry</span>
          </Link>
        </header>
        <div className="admin-content" style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: '#636366' }}>Loading member record details…</p>
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
          <Link className="admin-text-link admin-back-link" href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> All registrations
          </Link>
          <div className="form-error" role="alert" style={{ marginTop: '24px' }}>
            <span>{error || 'Record not found.'}</span>
          </div>
        </div>
      </main>
    )
  }

  const rawDigits = record.phone.replace(/[^0-9]/g, '')
  const whatsappChatUrl = `https://wa.me/${rawDigits}?text=${encodeURIComponent(`Hello ${record.fullName}, this is the Tina Like Minds admin verifying your registration (Code: ${record.code}).`)}`
  const voterCardUrl = `/api/admin/registrations/${id}/files/voter-card`
  const photoUrl = `/api/admin/registrations/${id}/files/photo`

  return (
    <main className="admin-page">
      {/* Top Header */}
      <header className="admin-header">
        <Link href="/admin" className="admin-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <img src="/images/logo.png" alt="Tina Like Minds Logo" width={32} height={32} style={{ borderRadius: 6, objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <span>Tina Like Minds <span>Registry Admin</span></span>
        </Link>
        <div className="admin-header-actions">
          <Link
            className="admin-export-button"
            href="/admin"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, minHeight: 36, padding: '6px 14px' }}
          >
            <ArrowLeft size={14} /> Back to List
          </Link>
        </div>
      </header>

      <div className="admin-content">
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: 20 }}>
          <Link
            className="admin-text-link admin-back-link"
            href="/admin"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#16303B', fontWeight: 600, fontSize: 14 }}
          >
            <ArrowLeft size={16} /> Back to all registrations
          </Link>
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div
            style={{
              padding: '14px 18px',
              marginBottom: 24,
              borderRadius: 8,
              backgroundColor: actionMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: actionMessage.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${actionMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* DECISION & CONFIRMATION CONTROL BANNER */}
        <div
          style={{
            background: record.status === 'verified' ? '#f0fdf4' : record.status === 'rejected' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${record.status === 'verified' ? '#86efac' : record.status === 'rejected' ? '#fca5a5' : '#fde68a'}`,
            borderRadius: 10,
            padding: '24px 28px',
            marginBottom: 28,
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: record.status === 'verified' ? '#15803d' : record.status === 'rejected' ? '#b91c1c' : '#b45309',
                }}
              >
                Verification Decision
              </span>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: '4px 0', color: '#0f172a' }}>
                Current Status:{' '}
                <span
                  style={{
                    color: record.status === 'verified' ? '#16a34a' : record.status === 'rejected' ? '#dc2626' : '#d97706',
                  }}
                >
                  {record.status.toUpperCase()}
                </span>
              </h2>
              <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>
                {record.status === 'verified'
                  ? `Verified on ${formatDate(record.verifiedAt)}. Member is approved.`
                  : record.status === 'rejected'
                  ? 'Registration was rejected. Member cannot access verified perks.'
                  : 'Pending verification. Review the voter card and face photo below, then click Confirm & Mark Verified.'}
              </p>
            </div>

            {/* Quick Decision Buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <a
                href={whatsappChatUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#25D366',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '10px 18px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <MessageSquare size={16} /> Open WhatsApp Chat
              </a>

              <button
                type="button"
                disabled={updatingStatus || record.status === 'verified'}
                onClick={() => updateStatus('verified')}
                style={{
                  background: record.status === 'verified' ? '#94a3b8' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: record.status === 'verified' ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                }}
              >
                <CheckCircle2 size={16} /> Confirm &amp; Mark Verified
              </button>

              <button
                type="button"
                disabled={updatingStatus || record.status === 'rejected'}
                onClick={() => updateStatus('rejected')}
                style={{
                  background: record.status === 'rejected' ? '#94a3b8' : '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: record.status === 'rejected' ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <XCircle size={16} /> Reject
              </button>

              {record.status !== 'pending' && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => updateStatus('pending')}
                  className="outline-button"
                  style={{ minHeight: 40, fontSize: 13 }}
                >
                  <Clock size={14} style={{ marginRight: 6 }} /> Reset to Pending
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid: Details (Left) + Uploaded Documents (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 28, alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Personal Info & Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Member Details Card */}
            <div
              style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                padding: '24px 28px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Member Information</h3>
                <span className={`status-pill status-${record.status}`}>{record.status}</span>
              </div>

              {/* Data Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Code */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Registration Code</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ fontSize: 15, fontWeight: 700, background: '#f8fafc', padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0', color: '#0f172a' }}>
                      {record.code}
                    </code>
                    <button
                      type="button"
                      className="outline-button"
                      style={{ padding: '3px 8px', fontSize: 12, minHeight: 28, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => copyText(record.code, 'code')}
                    >
                      {copiedField === 'code' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      {copiedField === 'code' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Full Name</span>
                  <strong style={{ fontSize: 15, color: '#0f172a' }}>{record.fullName}</strong>
                </div>

                {/* Phone */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>WhatsApp Phone</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a href={`tel:${record.phone}`} style={{ color: '#0b6e4f', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
                      {record.phone}
                    </a>
                    <button
                      type="button"
                      className="outline-button"
                      style={{ padding: '3px 8px', fontSize: 12, minHeight: 28, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => copyText(record.phone, 'phone')}
                    >
                      {copiedField === 'phone' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      {copiedField === 'phone' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Email Address</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a href={`mailto:${record.email}`} style={{ color: '#16303B', textDecoration: 'none', fontSize: 14 }}>
                      {record.email}
                    </a>
                    <button
                      type="button"
                      className="outline-button"
                      style={{ padding: '3px 8px', fontSize: 12, minHeight: 28, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => copyText(record.email, 'email')}
                    >
                      {copiedField === 'email' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      {copiedField === 'email' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* State & LGA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Location</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
                    {record.state} · {record.lga}
                  </span>
                </div>

                {/* Address */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Residential Address</span>
                  <span style={{ maxWidth: '65%', textAlign: 'right', color: '#0f172a', fontSize: 14 }}>
                    {record.address}
                  </span>
                </div>

                {/* Registered Timestamp */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Submission Date</span>
                  <span style={{ color: '#334155', fontSize: 13 }}>{formatDate(record.createdAt)}</span>
                </div>

                {/* Admin Email Sent */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Admin Alert Email</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: record.adminNotifiedAt ? '#16a34a' : '#d97706', fontSize: 13, fontWeight: 500 }}>
                      {record.adminNotifiedAt ? formatDate(record.adminNotifiedAt) : 'Not recorded'}
                    </span>
                    <button
                      type="button"
                      disabled={resendingEmail}
                      className="outline-button"
                      onClick={resendEmail}
                      style={{ padding: '3px 8px', fontSize: 12, minHeight: 28, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      title="Resend email alert to admin inbox"
                    >
                      <Send size={12} />
                      {resendingEmail ? 'Sending…' : 'Resend'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Notes Card with Quick-Templates */}
            <div
              style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                padding: '24px 28px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Admin Notes</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 14 }}>
                Private notes visible only to administrators.
              </p>

              {/* Quick Note Pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {QUICK_NOTES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setNotes((prev) => (prev ? `${prev}\n• ${preset}` : `• ${preset}`))
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={4}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type custom verification remarks or notes..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{notes.length} / 500 characters</span>
                <button
                  type="button"
                  className="submit-button"
                  disabled={savingNotes}
                  onClick={saveNotes}
                  style={{ minHeight: 36, padding: '6px 18px', fontSize: 13 }}
                >
                  {savingNotes ? 'Saving…' : 'Save Notes'}
                </button>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '24px 0 16px' }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #fca5a5',
                    color: '#dc2626',
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Trash2 size={14} /> Delete Member Record
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Document Verification Inspection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div
              style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                padding: '24px 28px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Document Inspection</h3>
                <span style={{ fontSize: 12, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <ShieldCheck size={14} /> Secure 60s Signed Links
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
                Click either image to open the full-screen interactive lightbox for high-resolution inspection.
              </p>

              {/* 1. Voter Card */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 14, color: '#1e293b' }}>1. Voter’s Card (PVC)</strong>
                  <button
                    type="button"
                    className="outline-button"
                    style={{ fontSize: 12, padding: '2px 8px', minHeight: 26, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => openLightbox(voterCardUrl, "Voter's Identification Card (PVC)")}
                  >
                    <ZoomIn size={12} /> Inspect Fullscreen
                  </button>
                </div>
                <div
                  onClick={() => openLightbox(voterCardUrl, "Voter's Identification Card (PVC)")}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: 8,
                    transition: 'border-color 0.2s',
                  }}
                >
                  <img
                    src={voterCardUrl}
                    alt="Voter's card document preview"
                    style={{
                      maxHeight: 260,
                      width: 'auto',
                      maxWidth: '100%',
                      margin: '0 auto',
                      borderRadius: 4,
                      display: 'block',
                    }}
                  />
                  <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                    Click to zoom &amp; inspect text
                  </span>
                </div>
              </div>

              {/* 2. Facial Photograph */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 14, color: '#1e293b' }}>2. Member Photograph</strong>
                  <button
                    type="button"
                    className="outline-button"
                    style={{ fontSize: 12, padding: '2px 8px', minHeight: 26, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => openLightbox(photoUrl, 'Member Facial Photograph')}
                  >
                    <ZoomIn size={12} /> Inspect Fullscreen
                  </button>
                </div>
                <div
                  onClick={() => openLightbox(photoUrl, 'Member Facial Photograph')}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: 8,
                  }}
                >
                  <img
                    src={photoUrl}
                    alt="Member face photo preview"
                    style={{
                      maxHeight: 260,
                      width: 'auto',
                      maxWidth: '100%',
                      margin: '0 auto',
                      borderRadius: 4,
                      display: 'block',
                    }}
                  />
                  <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                    Click to zoom &amp; compare with PVC
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULL-SCREEN INTERACTIVE LIGHTBOX */}
      {lightboxUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={() => setLightboxUrl(null)}
        >
          {/* Lightbox Toolbar */}
          <div
            style={{
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontWeight: 600, fontSize: 16 }}>{lightboxTitle}</span>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.25))}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ZoomOut size={16} /> Zoom Out
              </button>
              <span style={{ fontSize: 13, color: '#cbd5e1' }}>{Math.round(zoomScale * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.min(3, s + 0.25))}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ZoomIn size={16} /> Zoom In
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RotateCw size={16} /> Rotate
              </button>
              <button
                type="button"
                onClick={() => { setZoomScale(1); setRotation(0) }}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Image Canvas */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxUrl}
              alt={lightboxTitle}
              style={{
                maxWidth: '90%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 4,
                boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
                transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
              }}
            />
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
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
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '28px',
              borderRadius: 10,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>
              Permanent Record Deletion
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: '#475569', marginBottom: 16 }}>
              This will completely delete <strong>{record.fullName}</strong>&apos;s record and purge both uploaded photos from private cloud storage.
            </p>
            <p style={{ fontSize: 13, color: '#1e293b', marginBottom: 8, fontWeight: 600 }}>
              Type registration code <span style={{ fontFamily: 'monospace', color: '#dc2626' }}>{record.code}</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmCodeInput}
              onChange={(e) => setConfirmCodeInput(e.target.value.trim().toUpperCase())}
              placeholder={record.code}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontFamily: 'monospace',
                fontSize: 16,
                fontWeight: 700,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                marginBottom: 20,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
                disabled={confirmCodeInput !== record.code || deleting}
                onClick={handleDelete}
                style={{
                  backgroundColor: confirmCodeInput === record.code ? '#dc2626' : '#f87171',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 6,
                  fontWeight: 700,
                  cursor: confirmCodeInput === record.code ? 'pointer' : 'not-allowed',
                }}
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
