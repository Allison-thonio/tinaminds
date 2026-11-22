import 'server-only'
import { sendEmail } from './send'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDateLagos(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date) + ' (WAT)'
  } catch {
    return date.toUTCString()
  }
}

export type AdminNotificationData = {
  id: string
  code: string
  fullName: string
  phoneE164: string
  email: string
  address: string
  state: string
  lga: string
  createdAt: Date
}

export async function sendAdminNotification(data: AdminNotificationData): Promise<boolean> {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
  if (!adminEmail) return false

  const siteUrl = (process.env.SITE_URL || '').replace(/\/+$/, '')
  const recordUrl = siteUrl ? `${siteUrl}/admin/registrations/${data.id}` : `/admin/registrations/${data.id}`
  const formattedDate = formatDateLagos(data.createdAt)

  const subject = `New member registration: ${data.code}: ${data.fullName.replace(/[\r\n]+/g, ' ').trim()}`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f6f2; color: #1c1c1e; padding: 24px 12px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e5ea; overflow: hidden;">
    <div style="background-color: #0d2818; padding: 24px; color: #ffffff;">
      <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #d4af37;">Tina Like Minds Registry</span>
      <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 600; color: #ffffff;">New Member Registration</h1>
    </div>
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.6;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7; color: #636366; width: 35%;">Registration Code</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7; font-weight: 600; color: #0d2818; font-size: 16px;">${escapeHtml(data.code)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7; color: #636366;">Full Name</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7; font-weight: 600;">${escapeHtml(data.fullName)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7; color: #636366;">Phone Number</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7;">
            <a href="tel:${escapeHtml(data.phoneE164)}" style="color: #0b6e4f; text-decoration: none; font-weight: 500;">${escapeHtml(data.phoneE164)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7; color: #636366;">Email</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7;">${escapeHtml(data.email)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7; color: #636366;">Home Address</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7;">${escapeHtml(data.address)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7; color: #636366;">State &amp; LGA</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7;">${escapeHtml(data.state)} · ${escapeHtml(data.lga)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7; color: #636366;">Registered At</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f2f2f7;">${escapeHtml(formattedDate)}</td>
        </tr>
      </table>

      <div style="margin: 32px 0 16px; text-align: center;">
        <a href="${escapeHtml(recordUrl)}" style="display: inline-block; background-color: #0d2818; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">Open Record in Dashboard &rarr;</a>
      </div>

      <p style="margin: 20px 0 0; font-size: 13px; color: #8e8e93; text-align: center;">
        Photos and voter cards are available after signing in to the dashboard.
      </p>
    </div>
  </div>
</body>
</html>`

  const text = `NEW MEMBER REGISTRATION - TINA LIKE MINDS REGISTRY

Code: ${data.code}
Full Name: ${data.fullName}
Phone: ${data.phoneE164}
Email: ${data.email}
Address: ${data.address}
State/LGA: ${data.state} · ${data.lga}
Registered At: ${formattedDate}

Open record in dashboard:
${recordUrl}

(Photos are available after signing in to the dashboard.)`

  return await sendEmail({
    to: adminEmail,
    replyTo: data.email,
    subject,
    html,
    text,
  })
}
