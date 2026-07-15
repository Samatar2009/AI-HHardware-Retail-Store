import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/require-role'
import { embedText } from '@/lib/ai'

const bodySchema = z.object({ productId: z.string().uuid() })

export async function POST(request: Request) {
  const { error: authError } = await requireRole(['admin', 'inventory_manager'])
  if (authError) return authError

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('id, name_en, name_so, description_en, description_so, brand, tags')
    .eq('id', parsed.data.productId)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const text = [
    product.name_en,
    product.name_so,
    product.description_en,
    product.description_so,
    product.brand,
    (product.tags ?? []).join(' '),
  ]
    .filter(Boolean)
    .join('. ')

  try {
    const embedding = await embedText(text)

    const { error } = await supabase.from('product_embeddings').upsert(
      {
        product_id: product.id,
        embedding: JSON.stringify(embedding),
        embedding_text: text,
        language: 'combined',
        model_version: 'gemini-embedding-001',
        last_embedded_at: new Date().toISOString(),
      },
      { onConflict: 'product_id,language' }
    )

    if (error) {
      return NextResponse.json({ error: 'Could not save embedding' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Embedding generation failed' }, { status: 502 })
  }
}
