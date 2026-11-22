import 'server-only'
import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export type SendEmailParams = {
  to: string | string[]
  replyTo?: string
  subject: string
  html: string
  text: string
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const resend = getResendClient()
  const from = process.env.RESEND_FROM
  if (!resend || !from) {
    console.warn('[email] Resend is not configured (missing RESEND_API_KEY or RESEND_FROM). Email not sent.')
    return false
  }

  const toList = Array.isArray(params.to)
    ? params.to.map((t) => t.trim()).filter(Boolean)
    : params.to.split(',').map((t) => t.trim()).filter(Boolean)

  if (toList.length === 0) {
    console.warn('[email] No recipient specified.')
    return false
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    const response = await resend.emails.send({
      from,
      to: toList,
      replyTo: params.replyTo,
      subject: params.subject.replace(/[\r\n]+/g, ' ').trim(),
      html: params.html,
      text: params.text,
    })

    clearTimeout(timer)

    if (response.error) {
      console.error(`[email] Resend error: ${response.error.message}`)
      return false
    }

    return true
  } catch (cause) {
    console.error('[email] Failed to send email via Resend:', cause instanceof Error ? cause.message : cause)
    return false
  }
}
