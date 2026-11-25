import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Reuse a single Supabase client per process to avoid creating
// a new HTTP connection on every API call. This is critical at scale
// on serverless platforms like Vercel where cold starts are expensive.

let _client: SupabaseClient | null = null

export function createSupabaseAdmin(): SupabaseClient | null {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    db: { schema: 'public' },
    global: {
      headers: { 'x-client-info': 'tina-minds-registry/1.0' },
    },
  })
  return _client
}
