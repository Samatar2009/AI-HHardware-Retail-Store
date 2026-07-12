import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

// Thin alias of GET /api/pos/sessions — Build Plan Step 9.1 lists both
// paths (this one for "called on POS mount"). Same query, kept as a
// separate route so the mount-time check has a stable, cache-friendly URL.
export async function GET() {
  const { userId, error: authError } = await requireRole(['cashier', 'inventory_manager', 'admin'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pos_sessions')
    .select('*, location:locations(name_en)')
    .eq('cashier_id', userId)
    .eq('status', 'open')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Could not load session' }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}
