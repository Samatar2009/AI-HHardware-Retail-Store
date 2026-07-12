import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function DELETE(_request: Request, { params }: { params: { id: string; imageId: string } }) {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('product_images').delete().eq('id', params.imageId).eq('product_id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Could not remove image' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
