export const locales = ['en', 'so'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'
export const timeZone = 'Africa/Nairobi'

export const localeCookieName = 'locale'
