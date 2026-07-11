/**
 * One-off dev script: generates real Gemini text-embedding-004 vectors for
 * every seeded test product and inserts them into product_embeddings, so
 * Phase 5's semantic search (match_products_semantic) has real data to
 * rank against. Run with: npx tsx scripts/seed-embeddings.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const envPath = join(__dirname, '..', '.env.local')
  const text = readFileSync(envPath, 'utf-8')
  const values: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) values[m[1]] = m[2].trim().replace(/^"|"$/g, '')
  }
  return values
}

async function main() {
  const env = loadEnvLocal()
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
  const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name_en, name_so, description_en, description_so, brand, tags')

  if (error) throw error
  console.log(`Embedding ${products!.length} products...`)

  for (const p of products!) {
    const text = [p.name_en, p.name_so, p.description_en, p.description_so, p.brand, (p.tags ?? []).join(' ')]
      .filter(Boolean)
      .join('. ')

    const result = await embeddingModel.embedContent({
      content: { role: 'user', parts: [{ text }] },
      outputDimensionality: 768,
    } as Parameters<typeof embeddingModel.embedContent>[0] & { outputDimensionality: number })
    const embedding = result.embedding.values

    const { error: insertError } = await supabase.from('product_embeddings').insert({
      product_id: p.id,
      embedding: JSON.stringify(embedding),
      embedding_text: text,
      language: 'combined',
      model_version: 'text-embedding-004',
    })

    if (insertError) throw insertError
    console.log(`  ✓ ${p.name_en}`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
