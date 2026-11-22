'use client'

import { useEffect, useRef, useState } from 'react'
import { siteConfig } from '@/lib/config'
import { nigeriaLgas, nigeriaStates } from '@/lib/nigeria-lgas'
import { registrationSchema } from '@/lib/schemas'
import { prepareRegistrationImage } from '@/lib/client-image'
import { ImageUpload } from '@/components/shared/image-upload'

const steps = ['Personal details', 'Location', 'Documents', 'Review & consent']
const stepFields = [
  ['fullName', 'phone', 'email'],
  ['address', 'state', 'lga'],
  ['voterCard', 'photo'],
] as const

const fieldMessages: Record<string, string> = {
  fullName: 'Enter your full name.',
  phone: 'Enter a valid Nigerian phone number.',
  email: 'Enter a valid email address.',
  address: 'Enter an address between 10 and 200 characters.',
  state: 'Choose a state.',
  lga: 'Choose a local government in that state.',
}

type StoredSuccess = {
  code: string
  whatsappUrl: string | null
  adminWhatsappUrl: string | null
  memberEmailSent: boolean
  fullName: string
}

export default function Home() {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retryAvailable, setRetryAvailable] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [files, setFiles] = useState<{ voterCard?: File; photo?: File }>({})

  // Success state
  const [done, setDone] = useState(false)
  const [code, setCode] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const [adminWhatsappUrl, setAdminWhatsappUrl] = useState<string | null>(null)
  const [memberEmailSent, setMemberEmailSent] = useState(false)
  const [registeredName, setRegisteredName] = useState('')
  const [copied, setCopied] = useState(false)

  const [values, setValues] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    state: '',
    lga: '',
    consent: false,
    website: '',
    turnstileToken: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [focusField, setFocusField] = useState('')

  // Restore success state from sessionStorage if the user refreshed
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('tlm_success_record')
      if (stored) {
        const parsed = JSON.parse(stored) as StoredSuccess
        if (parsed.code) {
          setCode(parsed.code)
          setWhatsappUrl(parsed.whatsappUrl)
          setAdminWhatsappUrl(parsed.adminWhatsappUrl)
          setMemberEmailSent(parsed.memberEmailSent)
          setRegisteredName(parsed.fullName)
          setDone(true)
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [])

  useEffect(() => {
    if (!focusField) return
    document.getElementById(focusField)?.focus()
    setFocusField('')
  }, [focusField, step])

  const validateField = (field: string) => {
    const parsed = registrationSchema.safeParse({ ...values, consent: true })
    const issue = parsed.success ? undefined : parsed.error.issues.find((item) => item.path[0] === field)
    setErrors((current) => ({ ...current, [field]: issue ? fieldMessages[field] ?? issue.message : '' }))
  }

  const update = (key: keyof typeof values, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const selectImage = async (field: 'voterCard' | 'photo', source: File) => {
    try {
      const prepared = await prepareRegistrationImage(source)
      setFiles((current) => ({ ...current, [field]: prepared }))
      setErrors((current) => ({ ...current, [field]: '' }))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'This image could not be prepared. Try another image.'
      setErrors((current) => ({ ...current, [field]: message }))
      throw cause
    }
  }

  const removeImage = (field: 'voterCard' | 'photo') => {
    setFiles((current) => ({ ...current, [field]: undefined }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const continueStep = () => {
    const nextErrors: Record<string, string> = {}
    if (step < 2) {
      const parsed = registrationSchema.safeParse({ ...values, consent: true })
      const fields = stepFields[step]
      for (const field of fields) {
        const issue = parsed.success ? undefined : parsed.error.issues.find((item) => item.path[0] === field)
        if (issue) nextErrors[field] = fieldMessages[field] ?? issue.message
      }
    } else {
      if (!files.voterCard) nextErrors.voterCard = errors.voterCard || 'Add a clear photo of the front of your voter’s card.'
      if (!files.photo) nextErrors.photo = errors.photo || 'Add a clear, recent photograph of yourself.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setError('Please check the highlighted fields before continuing.')
      if (step < 2) setFocusField(Object.keys(nextErrors)[0])
      return
    }
    setError('')
    setStep((current) => Math.min(3, current + 1))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setRetryAvailable(false)

    if (!values.consent || !files.voterCard || !files.photo) {
      setError('Please complete every field and tick the consent box.')
      return
    }

    setBusy(true)
    try {
      const data = new FormData()
      Object.entries(values).forEach(([key, value]) => data.append(key, String(value)))
      data.append('voterCard', files.voterCard)
      data.append('photo', files.photo)

      const response = await fetch('/api/register', { method: 'POST', body: data })
      const result = (await response.json()) as {
        ok?: boolean
        code?: string
        whatsappUrl?: string | null
        adminWhatsappUrl?: string | null
        memberEmailSent?: boolean
        error?: { message?: string; fields?: Record<string, string> }
      }

      if (!response.ok || !result.ok) {
        if (response.status >= 500 || response.status === 429) setRetryAvailable(true)
        if (result.error?.fields) {
          setErrors(result.error.fields)
          const field = Object.keys(result.error.fields)[0]
          const destination = stepFields.findIndex((fields) => fields.some((name) => name === field))
          if (destination >= 0) {
            setStep(destination)
            setFocusField(field)
          }
        }
        throw new Error(result.error?.message ?? 'Registration is temporarily unavailable. Please try again later.')
      }

      const receivedCode = result.code ?? ''
      const receivedWhatsappUrl = result.whatsappUrl ?? null
      const receivedAdminWhatsappUrl = result.adminWhatsappUrl ?? null
      const emailSent = Boolean(result.memberEmailSent)

      setCode(receivedCode)
      setWhatsappUrl(receivedWhatsappUrl)
      setAdminWhatsappUrl(receivedAdminWhatsappUrl)
      setMemberEmailSent(emailSent)
      setRegisteredName(values.fullName)
      setDone(true)

      // Persist in sessionStorage so page reload preserves code
      try {
        sessionStorage.setItem(
          'tlm_success_record',
          JSON.stringify({
            code: receivedCode,
            whatsappUrl: receivedWhatsappUrl,
            adminWhatsappUrl: receivedAdminWhatsappUrl,
            memberEmailSent: emailSent,
            fullName: values.fullName,
          })
        )
      } catch {
        // Ignore
      }

      // Smooth scroll to success section
      document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })
    } catch (cause) {
      const networkFailure = cause instanceof TypeError
      setError(
        networkFailure
          ? 'We couldn’t reach the server. Check your connection and try again. Your details are still here.'
          : cause instanceof Error
            ? cause.message
            : 'We couldn’t reach the server. Check your connection and try again.'
      )
      if (networkFailure) setRetryAvailable(true)
    } finally {
      setBusy(false)
    }
  }

  // Pre-filled WhatsApp message to the admin
  const adminMessage = encodeURIComponent(
    `Hello, I just registered on the portal. My code is ${code}. Name: ${registeredName || values.fullName}.`
  )
  const sendToAdminHref = adminWhatsappUrl ? `${adminWhatsappUrl}?text=${adminMessage}` : null

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/images/logo.png"
            alt={`${siteConfig.orgShortName} logo`}
            width={34}
            height={34}
            style={{ borderRadius: 8, display: 'inline-block', objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <span>{siteConfig.orgShortName}</span>
        </a>
        <a className="header-link" href="#register">
          Register
        </a>
      </header>

      {/* Hero Section */}
      <section className="hero" id="top">
        <div className="hero-art" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow">A stronger community starts with trust</span>
          <h1>
            Verify your
            <br />
            membership.
          </h1>
          <p>
            Register once so the {siteConfig.orgShortName} admin can confirm who is who in our WhatsApp community. It takes about two minutes.
          </p>
          <a className="gold-button" href="#register">
            Register now <span aria-hidden="true">↗</span>
          </a>
          <small>Your details are stored securely and seen only by the {siteConfig.orgShortName} admin.</small>
        </div>
        <span className="hero-index">MEMBER REGISTRY · 01</span>
      </section>

      {/* How It Works */}
      <section className="how section-wrap">
        <div>
          <span className="eyebrow dark-eyebrow">A simple process</span>
          <h2>How it works</h2>
        </div>
        <div className="steps">
          {[
            ['01', 'Fill in your details.', 'Name, phone, email and where you live.'],
            ['02', 'Upload two photos.', "Your voter's card and a clear photograph of yourself."],
            ['03', 'Get your code.', 'Then head back to the WhatsApp group.'],
          ].map(([n, title, body]) => (
            <article className="step" key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Registration Section */}
      <section className="registration" id="register">
        <div className="section-wrap registration-grid">
          <aside className="registration-aside">
            <span className="eyebrow">Your community, connected</span>
            <h2>
              One community.
              <br />
              Known by name.
            </h2>
            <p>
              We ask for these details so the admin can recognise genuine members and help keep our WhatsApp community safe.
            </p>
            <div className="trust-note">
              <span aria-hidden="true">✳</span>
              <p>Your information is private, encrypted, and only visible to the {siteConfig.orgShortName} admin.</p>
            </div>
          </aside>

          <div className="form-card">
            {done ? (
              <section className="success" tabIndex={-1}>
                <span className="success-mark" aria-hidden="true">
                  ✓
                </span>
                <span className="eyebrow dark-eyebrow">Registration received</span>
                <h2>You&apos;re registered.</h2>
                <p>
                  {memberEmailSent
                    ? `Your code is below. We've also emailed it to you. Return to the WhatsApp group using the number you registered with.`
                    : `Your code is below. Please save it. Return to the WhatsApp group using the number you registered with.`}
                </p>

                <div className="code-container">
                  <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#636366' }}>
                    Your Membership Code
                  </span>
                  <div className="code-display">{code}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(code)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      } catch {
                        setCopied(false)
                      }
                    }}
                  >
                    {copied ? 'Copied to clipboard ✓' : 'Copy code'}
                  </button>
                </div>

                {/* WhatsApp Action Buttons */}
                {whatsappUrl && (
                  <div>
                    <a className="whatsapp-action-button" href={whatsappUrl} target="_blank" rel="noreferrer">
                      <span>Open the WhatsApp group</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                )}

                {sendToAdminHref && (
                  <div>
                    <a
                      className="whatsapp-action-button whatsapp-secondary-button"
                      href={sendToAdminHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>Send my code to the admin on WhatsApp</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                )}

                <p className="fine-print" style={{ marginTop: '20px' }}>
                  Keep this code. The admin may ask for it to confirm your membership.
                </p>
              </section>
            ) : (
              <form ref={formRef} onSubmit={submit} noValidate>
                <div className="form-heading">
                  <span className="eyebrow dark-eyebrow">Member registration</span>
                  <h2>Your details</h2>
                  <p>All fields are required to verify community membership.</p>
                </div>

                <div className="mobile-stepper">
                  <span>STEP 0{step + 1} / 04</span>
                  <strong>{steps[step]}</strong>
                  <span className="sr-only" aria-live="polite" aria-atomic="true">
                    Step {step + 1} of 4: {steps[step]}
                  </span>
                  <div className="progress-track" aria-hidden="true">
                    <i style={{ width: `${(step + 1) * 25}%` }} />
                  </div>
                </div>

                {error && (
                  <div className="form-error" role="alert">
                    <span>{error}</span>
                    {retryAvailable && (
                      <button
                        type="button"
                        className="outline-button retry-button"
                        onClick={() => formRef.current?.requestSubmit()}
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )}

                {/* Step 0: Personal */}
                <div className={`form-group ${step === 0 ? 'current-step' : ''}`}>
                  <h3>Personal</h3>
                  <label htmlFor="fullName">
                    Full name
                    <input
                      id="fullName"
                      required
                      autoComplete="name"
                      inputMode="text"
                      placeholder="e.g. Chukwuemeka Allison"
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                      onBlur={() => validateField('fullName')}
                      value={values.fullName}
                      onChange={(e) => update('fullName', e.target.value)}
                    />
                    {errors.fullName && (
                      <span id="fullName-error" className="field-error">
                        {errors.fullName}
                      </span>
                    )}
                  </label>

                  <label htmlFor="phone">
                    Phone number
                    <span id="phone-help" className="field-help">
                      The phone number you use on WhatsApp
                    </span>
                    <input
                      id="phone"
                      required
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="0803 123 4567"
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? 'phone-help phone-error' : 'phone-help'}
                      onBlur={() => validateField('phone')}
                      value={values.phone}
                      onChange={(e) => update('phone', e.target.value)}
                    />
                    {errors.phone && (
                      <span id="phone-error" className="field-error">
                        {errors.phone}
                      </span>
                    )}
                  </label>

                  <label htmlFor="email">
                    Email address
                    <input
                      id="email"
                      required
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="name@example.com"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      onBlur={() => validateField('email')}
                      value={values.email}
                      onChange={(e) => update('email', e.target.value)}
                    />
                    {errors.email && (
                      <span id="email-error" className="field-error">
                        {errors.email}
                      </span>
                    )}
                  </label>
                </div>

                {/* Step 1: Location */}
                <div className={`form-group ${step === 1 ? 'current-step' : ''}`}>
                  <h3>Location</h3>
                  <label htmlFor="address">
                    Home address
                    <textarea
                      id="address"
                      required
                      rows={3}
                      autoComplete="street-address"
                      placeholder="Street address, city"
                      aria-invalid={Boolean(errors.address)}
                      aria-describedby={errors.address ? 'address-error' : undefined}
                      onBlur={() => validateField('address')}
                      value={values.address}
                      onChange={(e) => update('address', e.target.value)}
                    />
                    {errors.address && (
                      <span id="address-error" className="field-error">
                        {errors.address}
                      </span>
                    )}
                  </label>

                  <label htmlFor="state">
                    State
                    <select
                      id="state"
                      required
                      autoComplete="address-level1"
                      aria-invalid={Boolean(errors.state)}
                      aria-describedby={errors.state ? 'state-error' : undefined}
                      onBlur={() => validateField('state')}
                      value={values.state}
                      onChange={(e) => {
                        update('state', e.target.value)
                        update('lga', '')
                      }}
                    >
                      <option value="">Choose your state</option>
                      {nigeriaStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {errors.state && (
                      <span id="state-error" className="field-error">
                        {errors.state}
                      </span>
                    )}
                  </label>

                  <label htmlFor="lga">
                    Local government
                    <select
                      id="lga"
                      required
                      disabled={!values.state}
                      aria-invalid={Boolean(errors.lga)}
                      aria-describedby={errors.lga ? 'lga-error' : undefined}
                      onBlur={() => validateField('lga')}
                      value={values.lga}
                      onChange={(e) => update('lga', e.target.value)}
                    >
                      <option value="">Choose your local government</option>
                      {(nigeriaLgas[values.state] ?? []).map((lga) => (
                        <option key={lga} value={lga}>
                          {lga}
                        </option>
                      ))}
                    </select>
                    {errors.lga && (
                      <span id="lga-error" className="field-error">
                        {errors.lga}
                      </span>
                    )}
                  </label>
                </div>

                {/* Step 2: Documents */}
                <div className={`form-group ${step === 2 ? 'current-step' : ''}`}>
                  <h3>Documents</h3>
                  <ImageUpload
                    title="Voter's card (PVC)"
                    helper="Take a clear photo of the front of your card. Make sure all text is readable."
                    file={files.voterCard}
                    error={errors.voterCard}
                    onSelect={(file) => selectImage('voterCard', file)}
                    onRemove={() => removeImage('voterCard')}
                  />
                  <ImageUpload
                    title="Your photograph"
                    helper="A clear, recent photo of your face, looking straight at the camera."
                    file={files.photo}
                    error={errors.photo}
                    capture="user"
                    onSelect={(file) => selectImage('photo', file)}
                    onRemove={() => removeImage('photo')}
                  />
                </div>

                {/* Step 3: Review & Consent */}
                <div className={`form-group consent-group ${step === 3 ? 'current-step' : ''}`}>
                  <h3>Review &amp; consent</h3>
                  <div className="review-summary">
                    <p>
                      <strong>{values.fullName || 'Your name'}</strong>
                      <br />
                      {values.phone || 'Phone number'} · {values.email || 'Email address'}
                    </p>
                    <p>
                      {values.address || 'Home address'}
                      <br />
                      {values.state}
                      {values.lga ? ` · ${values.lga}` : ''}
                    </p>
                    <p>
                      Voter&apos;s card: <strong>{files.voterCard ? 'Photo selected' : 'Not added'}</strong>
                      <br />
                      Photograph: <strong>{files.photo ? 'Photo selected' : 'Not added'}</strong>
                    </p>
                  </div>

                  <label className="consent-label">
                    <input
                      type="checkbox"
                      checked={values.consent}
                      onChange={(e) => update('consent', e.target.checked)}
                    />
                    <span>
                      I confirm the information is true and I agree that {siteConfig.dataController} may store and use my details, including my voter&apos;s card and photograph, to verify my membership. Read the{' '}
                      <a href="/privacy" target="_blank" rel="noreferrer">
                        privacy notice
                      </a>
                      .
                    </span>
                  </label>

                  {/* Honeypot anti-spam field */}
                  <input
                    className="honeypot"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={values.website}
                    onChange={(e) => update('website', e.target.value)}
                  />
                  <input type="hidden" name="turnstileToken" value={values.turnstileToken} readOnly />

                  <button className="submit-button" disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit registration'} <span aria-hidden="true">→</span>
                  </button>
                </div>

                <div className="wizard-actions">
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                  >
                    Back
                  </button>
                  {step < 3 ? (
                    <button type="button" className="submit-button" onClick={continueStep}>
                      Continue <span aria-hidden="true">→</span>
                    </button>
                  ) : (
                    <button type="submit" className="submit-button" disabled={busy}>
                      {busy ? 'Submitting…' : 'Submit registration'}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Why We Ask */}
      <section className="why section-wrap">
        <span className="eyebrow dark-eyebrow">Your trust matters</span>
        <h2>Why we ask for this</h2>
        <p>
          Our WhatsApp group is open to many people. Registering helps the admin identify genuine members and keep our community safe. Your voter&apos;s card and photograph are stored privately and never shared publicly. The admin reviews each registration by hand; nothing is verified automatically.
        </p>
        <a href="/privacy" className="text-link">
          Read our privacy notice <span aria-hidden="true">↗</span>
        </a>
      </section>

      {/* FAQ */}
      <section className="faq section-wrap">
        <div>
          <span className="eyebrow dark-eyebrow">A few answers</span>
          <h2>Frequently asked questions</h2>
        </div>
        <div className="faq-list">
          {[
            ['Why do I need to register?', 'To help the admin confirm genuine members of the WhatsApp group.'],
            ['Who can see my details?', `Only the ${siteConfig.orgShortName} admin. Your details are never shown publicly.`],
            ["Why do you need my voter's card?", 'It helps confirm that you are a real person in the community. We store it privately and never share it.'],
            ['Which WhatsApp number should I use?', 'Use the number you use in the WhatsApp group, so the admin can match you.'],
            [
              'I lost my code. What now?',
              siteConfig.supportEmail
                ? `Message the admin at ${siteConfig.supportEmail}. Please do not register again.`
                : `Message the admin in the WhatsApp group, or contact the ${siteConfig.orgShortName} admin directly. Please do not register again.`,
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <a className="wordmark" href="#top" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/images/logo.png"
            alt={`${siteConfig.orgShortName} logo`}
            width={34}
            height={34}
            style={{ borderRadius: 8, display: 'inline-block', objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <span>{siteConfig.orgShortName}</span>
        </a>
        <div>
          <a href="/privacy">Privacy notice</a>
          {siteConfig.supportEmail && <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>}
          {siteConfig.adminWhatsappNumber && (
            <a href={`https://wa.me/${siteConfig.adminWhatsappNumber}`} target="_blank" rel="noreferrer">
              Message the admin on WhatsApp
            </a>
          )}
        </div>
        <small>
          © {new Date().getFullYear()} {siteConfig.orgName}
        </small>
      </footer>
    </main>
  )
}
