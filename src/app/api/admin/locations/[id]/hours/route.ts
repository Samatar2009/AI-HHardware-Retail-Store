import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-role'

const hoursSchema = z.object({
  hours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        openTime: z.string(),
        closeTime: z.string(),
        isClosed: z.boolean().default(false),
        hasPrayerBreak: z.boolean().default(false),
        prayerStart: z.string().nullable().optional(),
        prayerEnd: z.string().nullable().optional(),
      })
    )
    .length(7),
})

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = hoursSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid hours data' }, { status: 400 })
  }

  const supabase = await createClient()

  await supabase.from('location_hours').delete().eq('location_id', params.id)

  const { error } = await supabase.from('location_hours').insert(
    parsed.data.hours.map((h) => ({
      location_id: params.id,
      day_of_week: h.dayOfWeek,
      open_time: h.openTime,
      close_time: h.closeTime,
      is_closed: h.isClosed,
      has_prayer_break: h.hasPrayerBreak,
      prayer_start: h.prayerStart ?? null,
      prayer_end: h.prayerEnd ?? null,
    }))
  )

  if (error) {
    return NextResponse.json({ error: 'Could not save hours' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
