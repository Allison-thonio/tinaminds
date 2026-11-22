import 'server-only'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const BUCKET_NAME = 'registrations-private'

export async function uploadRegistrationImages(
  registrationId: string,
  voterCardBuffer: Buffer,
  photoBuffer: Buffer
): Promise<{ voterCardPath: string; photoPath: string }> {
  const supabase = createSupabaseAdmin()
  if (!supabase) throw new Error('Database client not configured')

  const voterCardPath = `${registrationId}/voter-card.jpg`
  const photoPath = `${registrationId}/photo.jpg`

  const uploadVoter = await supabase.storage.from(BUCKET_NAME).upload(voterCardPath, voterCardBuffer, {
    contentType: 'image/jpeg',
    upsert: false,
  })

  if (uploadVoter.error) {
    throw new Error(`Failed to upload voter card: ${uploadVoter.error.message}`)
  }

  const uploadPhoto = await supabase.storage.from(BUCKET_NAME).upload(photoPath, photoBuffer, {
    contentType: 'image/jpeg',
    upsert: false,
  })

  if (uploadPhoto.error) {
    // Clean up voter card on failure
    await supabase.storage.from(BUCKET_NAME).remove([voterCardPath]).catch(() => {})
    throw new Error(`Failed to upload photograph: ${uploadPhoto.error.message}`)
  }

  return { voterCardPath, photoPath }
}

export async function deleteRegistrationImages(registrationId: string): Promise<void> {
  const supabase = createSupabaseAdmin()
  if (!supabase) return
  const paths = [`${registrationId}/voter-card.jpg`, `${registrationId}/photo.jpg`]
  await supabase.storage.from(BUCKET_NAME).remove(paths).catch(() => {})
}

export async function getSignedImageUrl(path: string, expiresInSeconds = 60): Promise<string | null> {
  const supabase = createSupabaseAdmin()
  if (!supabase) return null
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, expiresInSeconds)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
