import { redirect } from 'next/navigation'

// The actual open-session flow lives at /pos/open-session (the cashier
// role's established post-login redirect target, per src/lib/constants.ts
// ROLE_HOME_PATH from Phase 4). Closing a session happens from a dialog on
// the main POS screen instead of a dedicated route. This page only exists
// so the placeholder scaffolded in Phase 0 doesn't dead-end.
export default function PosSessionPage() {
  redirect('/pos/open-session')
}
