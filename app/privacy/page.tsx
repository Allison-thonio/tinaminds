import Link from 'next/link'
import { siteConfig } from '@/lib/config'

export default function PrivacyPage() {
  const contact = siteConfig.supportEmail ? `Contact the ${siteConfig.orgShortName} admin at ${siteConfig.supportEmail}.` : `Contact the ${siteConfig.orgShortName} admin through the WhatsApp group.`
  const sections = [
    ['Who we are.', `${siteConfig.dataController} ("we", "us") runs this member registry. We are the data controller for the information you give us here.`],
    ['What we collect.', "Your full name, phone number, email address, home address, state and local government area, a photograph of your voter's card, and a photograph of yourself. We also record the date and time of your registration, a one-way fingerprint of your network address (we do not keep the address itself), and your browser type, to help prevent abuse."],
    ['Why we collect it.', 'To confirm that people in our WhatsApp group are genuine members and to keep our community safe. The admin reviews each registration by hand and matches it to members of the group. Nothing is verified automatically.'],
    ['Our legal basis.', 'Your consent, which you give by ticking the box on the form. You can withdraw it at any time.'],
    ['Who can see your details.', `Only the ${siteConfig.orgShortName} admin. Your details are never published or shown to other members.`],
    ['Service providers.', 'We use trusted providers to run this site: Vercel (hosting), Supabase (database and private file storage), Resend (sending email) and, where enabled, Cloudflare (bot protection). They process data only to provide their service to us. Some of them may process data outside Nigeria. We choose providers that apply appropriate safeguards.'],
    ['How we protect it.', 'Your voter’s card and photograph are stored in private storage and are only visible to the admin after signing in. Connections to this site are encrypted. Images are processed to remove hidden location data.'],
    ['How long we keep it.', `We keep your details ${siteConfig.retentionText}.`],
    ['Your rights.', 'Under the Nigeria Data Protection Act 2023 you have the right to ask us to give you a copy of your data, correct it, delete it, restrict or object to its use, and withdraw your consent. To use any of these rights, contact us (see below). We will respond within 30 days. You also have the right to complain to the Nigeria Data Protection Commission.'],
    ['Children.', 'This registry is for adults. Please do not register if you are under 18.'],
    ['Cookies and storage.', "We do not use advertising or analytics cookies. We use one essential, secure cookie only for admin sign-in, and your browser's temporary session storage to keep your code visible if you refresh the page after registering."],
    ['Changes.', 'We may update this notice. The latest version is always on this page.'],
    ['Contact.', contact],
  ]
  return <main className="privacy-page"><Link href="/" className="privacy-back">← Back to registry</Link><article><span className="eyebrow dark-eyebrow">{siteConfig.orgShortName}</span><h1>Privacy notice</h1>{siteConfig.privacyLastUpdated&&<p className="privacy-updated">Last updated: {siteConfig.privacyLastUpdated}</p>}{sections.map(([title,body],i)=><section key={title}><h2>{String(i+1).padStart(2,'0')} &nbsp; {title}</h2><p>{body}</p></section>)}</article></main>
}
