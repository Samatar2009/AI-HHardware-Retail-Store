'use server'

import { cookies } from 'next/headers'

import { locales, localeCookieName, type Locale } from './config'

export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) return
  const store = await cookies()
  store.set(localeCookieName, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
}
