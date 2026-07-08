import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

import { env } from './env'

const redis = new Redis({
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
}
