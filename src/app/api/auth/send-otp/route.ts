import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { rateLimiters, redis } from '@/lib/ratelimit'
import { getClientIp } from '@/lib/get-client-ip'
import { phoneE164Schema } from '@/lib/validators'
import { otpLockKey } from '@/lib/otp-lock'

const bodySchema = z.object({ phone: phoneE164Schema })

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }
  const { phone } = parsed.data

  // App Flow doc Section 2.6: a phone locked from 3 failed verify attempts
  // cannot request a new OTP during the 15-minute lock window.
  const isLocked = await redis.get(otpLockKey(phone))
  if (isLocked) {
    return NextResponse.json(
      { error: 'Screen locked for 15 minutes. Cannot request new OTP during lock.' },
      { status: 423 }
    )
  }

  const ip = getClientIp(request)
  const [ipLimit, phoneLimit] = await Promise.all([
    rateLimiters.auth.limit(ip),
    rateLimiters.otpPerPhone.limit(phone),
  ])
  if (!ipLimit.success || !phoneLimit.success) {
    return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ phone })

  if (error) {
    return NextResponse.json({ error: 'Could not send code. Check connection and try again.' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
