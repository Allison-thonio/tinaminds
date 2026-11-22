import 'server-only'
import { siteConfig } from '@/lib/config'
import { sendEmail } from './send'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export type MemberConfirmationData = {
  fullName: string
  email: string
  phoneE164: string
  code: string
}

export async function sendMemberConfirmation(data: MemberConfirmationData): Promise<boolean> {
  const firstName = data.fullName.trim().split(/\s+/)[0] || 'Member'
  const whatsappUrl = process.env.WHATSAPP_GROUP_INVITE_URL || ''
  const subject = `Your ${siteConfig.orgShortName} registration code: ${data.code}`

  const footerNotice = siteConfig.supportEmail
    ? `If this wasn't you, ignore this email or contact ${siteConfig.supportEmail}.`
    : `If this wasn't you, you can ignore this email.`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f6f2; color: #1c1c1e; padding: 24px 12px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e5ea; overflow: hidden;">
    <div style="background-color: #0d2818; padding: 24px; color: #ffffff;">
      <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #d4af37;">${escapeHtml(siteConfig.orgName)}</span>
      <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 600; color: #ffffff;">Registration Received</h1>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 16px; margin: 0 0 16px;">Hello ${escapeHtml(firstName)},</p>
      <p style="font-size: 15px; line-height: 1.5; color: #3a3a3c; margin: 0 0 20px;">
        Thank you for registering. Your unique membership registration code is:
      </p>

      <div style="background: #f7f6f2; border: 1px dashed #d4af37; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace, Courier, sans-serif; font-size: 28px; font-weight: 700; letter-spacing: 0.15em; color: #0d2818;">
          ${escapeHtml(data.code)}
        </span>
      </div>

      <p style="font-size: 14px; line-height: 1.5; color: #3a3a3c; margin: 20px 0;">
        Please return to the WhatsApp group using the number you registered with: <strong>${escapeHtml(data.phoneE164)}</strong>. The admin will verify your details.
      </p>

      ${
        whatsappUrl
          ? `<div style="margin: 28px 0; text-align: center;">
              <a href="${escapeHtml(whatsappUrl)}" style="display: inline-block; background-color: #0b6e4f; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">Open the WhatsApp Group &rarr;</a>
            </div>`
          : ''
      }

      <hr style="border: none; border-top: 1px solid #e5e5ea; margin: 28px 0 16px;">

      <p style="font-size: 12px; color: #8e8e93; line-height: 1.4; margin: 0;">
        ${escapeHtml(footerNotice)}
      </p>
    </div>
  </div>
</body>
</html>`

  const text = `Hello ${firstName},

Thank you for registering with ${siteConfig.orgName}.

Your registration code is:
${data.code}

Please return to the WhatsApp group using the number you registered with: ${data.phoneE164}.
${whatsappUrl ? `Group link: ${whatsappUrl}\n` : ''}
${footerNotice}`

  return await sendEmail({
    to: data.email,
    subject,
    html,
    text,
  })
}
