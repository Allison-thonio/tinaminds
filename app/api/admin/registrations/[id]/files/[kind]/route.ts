import { NextResponse } from 'next/server'
import { isAuthenticatedAdmin } from '@/lib/auth'
import { getSignedImageUrl } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {
  params: Promise<{ id: string; kind: string }>
}

export async function GET(request: Request, context: RouteContext) {
  if (!(await isAuthenticatedAdmin(request))) {
    return NextResponse.json({ ok: false, error: { code: 'unauthorized', message: 'Unauthorized' } }, { status: 401 })
  }

  const { id, kind } = await context.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: { code: 'bad_request', message: 'Invalid ID format' } }, { status: 400 })
  }

  if (kind !== 'voter-card' && kind !== 'photo') {
    return NextResponse.json({ ok: false, error: { code: 'not_found', message: 'File not found' } }, { status: 404 })
  }

  const filename = kind === 'voter-card' ? 'voter-card.jpg' : 'photo.jpg'
  const path = `${id}/${filename}`

  const signedUrl = await getSignedImageUrl(path, 60)
  if (!signedUrl) {
    return NextResponse.json({ ok: false, error: { code: 'not_found', message: 'File not found' } }, { status: 404 })
  }

  const response = NextResponse.redirect(signedUrl, 302)
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}
