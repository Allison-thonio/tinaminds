import { z } from 'zod'
import { nigeriaLgas } from '@/lib/nigeria-lgas'
import { normalizeNigerianPhone } from '@/lib/phone'
import { cleanText, isValidName } from '@/lib/text'

export const registrationSchema = z.object({
  fullName: z.string().transform(cleanText).refine(isValidName, 'Enter a valid full name.'),
  phone: z.string().transform((raw) => normalizeNigerianPhone(raw) ?? '').refine(Boolean, 'Enter a valid Nigerian phone number, e.g. 0803 123 4567.'),
  email: z.string().transform((email) => email.trim().toLowerCase()).pipe(z.string().email('Enter a valid email address.').max(254)),
  address: z.string().transform(cleanText).pipe(z.string().min(10).max(200)),
  state: z.string().refine((state) => Object.hasOwn(nigeriaLgas, state), 'Choose a valid state.'),
  lga: z.string(),
  consent: z.literal(true, { error: 'Please tick the box to continue.' }),
}).superRefine((values, context) => {
  if (values.state && !nigeriaLgas[values.state]?.includes(values.lga)) {
    context.addIssue({ code: 'custom', path: ['lga'], message: 'Choose a local government in the selected state.' })
  }
})

export type RegistrationInput = z.input<typeof registrationSchema>
export type ValidRegistration = z.output<typeof registrationSchema>
