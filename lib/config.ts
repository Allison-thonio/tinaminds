export const siteConfig = {
  orgName: 'Tina Like Minds Empowerment Initiative',
  orgShortName: 'Tina Like Minds',
  tagline: 'Verified members. One community.',
  codePrefix: 'TLM',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '',
  adminWhatsappNumber: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? '',
  dataController: 'Tina Like Minds Empowerment Initiative',
  retentionText: 'for as long as you remain a member, or until you ask us to delete them',
  privacyResponseDays: '30 days',
  privacyLastUpdated: process.env.NEXT_PUBLIC_PRIVACY_UPDATED ?? '',
  consentVersion: '2026-11-v1',
  imageAlt: {
    hero: 'Community members of Tina Like Minds Empowerment Initiative',
    story: 'Members of Tina Like Minds Empowerment Initiative together',
  },
} as const
