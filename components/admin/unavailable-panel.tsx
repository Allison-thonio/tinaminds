import Link from 'next/link'

type UnavailablePanelProps = {
  title: string
  description: string
  backHref?: string
  backLabel?: string
}

export function UnavailablePanel({ title, description, backHref = '/admin', backLabel = 'Back to dashboard' }: UnavailablePanelProps) {
  return (
    <section className="admin-unavailable" role="status" aria-live="polite">
      <span className="admin-unavailable-icon" aria-hidden="true">!</span>
      <div>
        <p className="admin-eyebrow">Secure workspace unavailable</p>
        <h2>{title}</h2>
        <p>{description}</p>
        <Link className="admin-text-link" href={backHref}>{backLabel}</Link>
      </div>
    </section>
  )
}
