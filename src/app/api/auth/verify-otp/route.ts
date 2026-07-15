import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { rateLimiters, redis } from '@/lib/ratelimit'
import { getClientIp } from '@/lib/get-client-ip'
import { otpTokenSchema, phoneE164Schema } from '@/lib/validators'
import { OTP_LOCK_SECONDS, OTP_MAX_ATTEMPTS, otpAttemptsKey, otpLockKey } from '@/lib/otp-lock'

const bodySchema = z.object({ phone: phoneE164Schema, token: otpTokenSchema })

const LOCKED_MESSAGE = 'Screen locked for 15 minutes. Cannot request new OTP during lock.'

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid phone number or code' }, { status: 400 })
  }
  const { phone, token } = parsed.data

  const isLocked = await redis.get(otpLockKey(phone))
  if (isLocked) {
    return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 423 })
  }

  const ip = getClientIp(request)
  const { success } = await rateLimiters.auth.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })

  if (error || !data.session) {
    // App Flow doc Section 2.6: 3 wrong codes locks the phone for 15 min.
    const attempts = await redis.incr(otpAttemptsKey(phone))
    if (attempts === 1) await redis.expire(otpAttemptsKey(phone), OTP_LOCK_SECONDS)

    if (attempts >= OTP_MAX_ATTEMPTS) {
      await redis.set(otpLockKey(phone), '1', { ex: OTP_LOCK_SECONDS })
      await redis.del(otpAttemptsKey(phone))
      return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 423 })
    }

    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  await redis.del(otpAttemptsKey(phone))
  await redis.del(otpLockKey(phone))

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', data.session.user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Signed in, but profile could not be loaded' },
      { status: 500 }
    )
  }

  return NextResponse.json({ session: data.session, profile })
}
