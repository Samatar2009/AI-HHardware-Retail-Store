/**
 * Validates a `?next=` redirect target is a same-origin relative path, never
 * an absolute URL or protocol-relative path (open-redirect prevention).
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}
