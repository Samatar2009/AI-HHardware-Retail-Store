import '@testing-library/jest-dom'
import { vi } from 'vitest'

// 'server-only' throws unconditionally when resolved via plain Node/Vite
// module resolution (its package.json only swaps in the no-op build under
// webpack's "react-server" condition, which Vitest doesn't set) — every
// server-only-marked module (src/lib/supabase/admin.ts,
// src/lib/pos-transaction.ts, etc.) would otherwise fail on import in tests.
vi.mock('server-only', () => ({}))

// env.ts parses process.env at import time and throws if anything required
// is missing. These dummy values let any module that transitively imports
// env.ts load in tests without needing real credentials. src/lib/env.test.ts
// exercises the real throw/parse behaviour in isolation via vi.resetModules().
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
process.env.GEMINI_API_KEY ??= 'test-gemini-key'
process.env.UPSTASH_REDIS_REST_URL ??= 'https://test-redis.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN ??= 'test-redis-token'
process.env.TWILIO_ACCOUNT_SID ??= 'test-twilio-sid'
process.env.TWILIO_AUTH_TOKEN ??= 'test-twilio-token'
process.env.TWILIO_PHONE_NUMBER ??= '+15005550006'
process.env.NEXT_PUBLIC_APP_URL ??= 'https://test.example.com'
process.env.NEXT_PUBLIC_DEFAULT_LOCATION_ID ??= '00000000-0000-0000-0000-000000000001'
