import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const REQUIRED_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_DEFAULT_LOCATION_ID',
] as const

const VALID_ENV: Record<(typeof REQUIRED_KEYS)[number], string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  GEMINI_API_KEY: 'gemini-key',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'redis-token',
  TWILIO_ACCOUNT_SID: 'twilio-sid',
  TWILIO_AUTH_TOKEN: 'twilio-token',
  TWILIO_PHONE_NUMBER: '+15005550006',
  NEXT_PUBLIC_APP_URL: 'https://example.com',
  NEXT_PUBLIC_DEFAULT_LOCATION_ID: '00000000-0000-0000-0000-000000000001',
}

// env.ts calls envSchema.parse(process.env) at module-load time, so each test
// mutates process.env and re-imports the module fresh via vi.resetModules().
describe('env', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('parses successfully when all required variables are set', async () => {
    process.env = { ...process.env, ...VALID_ENV }
    const { env } = await import('@/lib/env')
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    expect(env.NEXT_PUBLIC_DEFAULT_LOCATION_ID).toBe(VALID_ENV.NEXT_PUBLIC_DEFAULT_LOCATION_ID)
  })

  it.each(REQUIRED_KEYS)('throws when %s is missing', async (key) => {
    const withoutKey = { ...VALID_ENV }
    delete (withoutKey as Record<string, string | undefined>)[key]
    process.env = { ...process.env, ...withoutKey }
    delete process.env[key]

    await expect(import('@/lib/env')).rejects.toThrow()
  })

  it('throws when NEXT_PUBLIC_SUPABASE_URL is not a valid URL', async () => {
    process.env = { ...process.env, ...VALID_ENV, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' }
    await expect(import('@/lib/env')).rejects.toThrow()
  })

  it('throws when NEXT_PUBLIC_DEFAULT_LOCATION_ID is not a valid UUID', async () => {
    process.env = { ...process.env, ...VALID_ENV, NEXT_PUBLIC_DEFAULT_LOCATION_ID: 'not-a-uuid' }
    await expect(import('@/lib/env')).rejects.toThrow()
  })
})
