import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'

export async function GET(request: Request) {
  const { userId, role, error: authError } = await requireRole(['inventory_manager', 'admin'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const lowStockOnly = searchParams.get('low_stock_only') === 'true'
  const outOfStockOnly = searchParams.get('out_of_stock_only') === 'true'

  const supabase = await createClient()

  let locationId = searchParams.get('location_id')
  if (role === 'inventory_manager') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('location_id')
      .eq('user_id', userId)
      .single()
    if (!profile?.location_id) {
      return NextResponse.json({ error: 'No location assigned to this account' }, { status: 400 })
    }
    locationId = profile.location_id
  }
  if (!locationId) {
    const { data: firstLocation } = await supabase
      .from('locations')
      .select('id')
      .eq('is_active', true)
      .order('name_en')
      .limit(1)
      .single()
    locationId = firstLocation?.id ?? null
  }
  if (!locationId) {
    return NextResponse.json({ error: 'No active location found' }, { status: 404 })
  }

  const query = supabase
    .from('inventory')
    .select(
      '*, product:products(name_en, name_so, sku_base, category:categories(name_en), product_images(thumbnail_url, sort_order)), variant:product_variants(sku, attributes)'
    )
    .eq('location_id', locationId)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Could not load inventory' }, { status: 500 })
  }

  let rows = data ?? []

  if (lowStockOnly) {
    rows = rows.filter((r) => r.quantity_on_hand > 0 && r.quantity_on_hand <= r.threshold)
  }
  if (outOfStockOnly) {
    rows = rows.filter((r) => r.quantity_on_hand === 0)
  }
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter((r) => {
      const product = r.product as unknown as { name_en: string; sku_base: string } | null
      const variant = r.variant as unknown as { sku: string } | null
      return (
        product?.name_en?.toLowerCase().includes(q) ||
        product?.sku_base?.toLowerCase().includes(q) ||
        variant?.sku?.toLowerCase().includes(q)
      )
    })
  }

  return NextResponse.json({ inventory: rows, locationId })
}
