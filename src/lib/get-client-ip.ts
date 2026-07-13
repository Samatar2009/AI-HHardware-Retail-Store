// A client can send its own X-Forwarded-For header on the original
// request. A trusted reverse proxy (Vercel's edge, etc.) appends the real
// connecting IP as it forwards the request rather than replacing the
// header outright, so the *first* entry is attacker-controlled and the
// *last* entry is the one the proxy itself observed — taking [0] let
// anyone rotate a fake IP per request to bypass every per-IP rate limiter
// that keys off this value. x-real-ip is set directly by the platform (not
// appended to by a chain) and is preferred when present.
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const parts = forwardedFor.split(',').map((p) => p.trim())
    return parts[parts.length - 1]!
  }

  return '127.0.0.1'
}
