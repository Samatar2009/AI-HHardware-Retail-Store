import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

import { defaultLocale, locales, localeCookieName, timeZone, type Locale } from './config'

export default getRequestConfig(async () => {
  const store = await cookies()
  const requested = store.get(localeCookieName)?.value
  const locale: Locale = locales.includes(requested as Locale)
    ? (requested as Locale)
    : defaultLocale

  return {
    locale,
    timeZone,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
