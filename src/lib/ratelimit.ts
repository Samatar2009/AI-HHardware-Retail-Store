import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

import { env } from './env'

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})

export const rateLimiters = {
  apiGeneral: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '10 s'),
    prefix: 'ratelimit:api-general',
  }),
  aiChat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'ratelimit:ai-chat',
  }),
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'ratelimit:search',
  }),
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5 m'),
    prefix: 'ratelimit:auth',
  }),
  // App Flow doc Section 2: max 3 OTP requests per hour per phone number
  // (distinct attack vector from the per-IP `auth` limiter above).
  otpPerPhone: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'ratelimit:otp-per-phone',
  }),
  // Phase 4 Step 4.1 (PATCH /api/auth/profile) needs a distinct rate from
  // the four limiters above.
  profileUpdate: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ratelimit:profile-update',
  }),
}
