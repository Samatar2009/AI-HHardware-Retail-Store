'use client'

import { useLocale } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Phone } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface LocationHours {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
  has_prayer_break: boolean
  prayer_start: string | null
  prayer_end: string | null
}

interface Location {
  id: string
  name_en: string
  name_so: string
  address: string
  phone: string
  location_hours: LocationHours[]
}

function formatTime(time: string) {
  const [h, m] = time.split(':')
  const hour = Number(h)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${m} ${period}`
}

export default function ContactPage() {
  const locale = useLocale()

  const { data, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await fetch('/api/locations')
      return (await res.json()) as { locations: Location[] }
    },
  })
  const locations = data?.locations ?? []

  return (
    <div className="mx-auto max-w-screen-xl bg-white px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold leading-[38px] text-stone-900">Contact & Locations</h1>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <p className="text-sm text-stone-500">No branches to show right now.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {locations.map((location) => {
            const name = locale === 'so' ? location.name_so : location.name_en
            const hours = [...location.location_hours].sort((a, b) => a.day_of_week - b.day_of_week)

            return (
              <div key={location.id} className="rounded-lg border border-stone-200 p-5">
                <h2 className="mb-3 text-lg font-semibold text-stone-900">{name}</h2>

                <div className="mb-2 flex items-start gap-2 text-sm text-stone-700">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-orange-500" aria-hidden="true" />
                  <span>{location.address}</span>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-4 inline-block text-xs font-medium text-orange-600 hover:text-orange-700"
                >
                  Get Directions
                </a>

                <a
                  href={`tel:${location.phone}`}
                  className="mb-4 flex items-center gap-2 text-sm text-stone-700 hover:text-orange-600"
                >
                  <Phone className="size-4 shrink-0 text-orange-500" aria-hidden="true" />
                  {location.phone}
                </a>

                {hours.length > 0 && (
                  <div className="border-t border-stone-100 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Opening Hours
                    </p>
                    <dl className="flex flex-col gap-1 text-sm text-stone-700">
                      {hours.map((h) => (
                        <div key={h.day_of_week} className="flex justify-between gap-2">
                          <dt>{DAYS[h.day_of_week]}</dt>
                          <dd className="text-right">
                            {h.is_closed ? (
                              'Closed'
                            ) : (
                              <>
                                {formatTime(h.open_time)} – {formatTime(h.close_time)}
                                {h.has_prayer_break && h.prayer_start && h.prayer_end && (
                                  <span className="block text-xs text-stone-500">
                                    Prayer break {formatTime(h.prayer_start)} –{' '}
                                    {formatTime(h.prayer_end)}
                                  </span>
                                )}
                              </>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
