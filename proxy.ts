import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname === '/admin/login'
    const token =
      request.cookies.get('__Host-admin_session')?.value ||
      request.cookies.get('admin_session')?.value

    let isAuthenticated = false

    if (token) {
      try {
        const secret = process.env.ADMIN_SESSION_SECRET
        if (secret && secret.length >= 32) {
          const secretKey = new TextEncoder().encode(secret)
          const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] })
          isAuthenticated = payload.role === 'admin'
        }
      } catch {
        isAuthenticated = false
      }
    }

    if (!isAuthenticated && !isLoginPage) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    if (isAuthenticated && isLoginPage) {
      const adminUrl = new URL('/admin', request.url)
      return NextResponse.redirect(adminUrl)
    }
  }

  return NextResponse.next()
}

export const middleware = proxy

export const config = {
  matcher: ['/admin/:path*'],
}
