import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { rateLimiters } from '@/lib/ratelimit'
import { getClientIp } from '@/lib/get-client-ip'

const bodySchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  preferred_language: z.enum(['en', 'so']).optional(),
  preferred_currency: z.enum(['SLSH', 'USD']).optional(),
})

export async function PATCH(request: Request) {
  const ip = getClientIp(request)
  const { success } = await rateLimiters.profileUpdate.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid profile data' }, { status: 400 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
