/**
 * Batch-generates embeddings for every active product that doesn't have one
 * yet. Run with: npx tsx src/scripts/batch-embed.ts
 *
 * This talks to Supabase and Gemini directly rather than making HTTP calls
 * to POST /api/ai/embed-product — a CLI script has no browser session to
 * authenticate an admin request with, so it replicates that route's exact
 * embedding-text/upsert logic instead. Same approach already established by
 * scripts/seed-embeddings.ts in Phase 5.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const envPath = join(__dirname, '..', '..', '.env.local')
  const text = readFileSync(envPath, 'utf-8')
  const values: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) values[m[1]] = m[2].trim().replace(/^"|"$/g, '')
  }
  return values
}

const DELAY_MS = 500

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const env = loadEnvLocal()
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
  const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name_en, name_so, description_en, description_so, brand, tags')
    .eq('is_active', true)

  if (error) throw error

  const { data: embedded } = await supabase
    .from('product_embeddings')
    .select('product_id')
    .eq('language', 'combined')
  const embeddedIds = new Set((embedded ?? []).map((e) => e.product_id))

  const toEmbed = (products ?? []).filter((p) => !embeddedIds.has(p.id))

  if (toEmbed.length === 0) {
    console.log('All active products already have embeddings. Nothing to do.')
    return
  }

  console.log(
    `Embedding ${toEmbed.length} of ${products!.length} active products (${embeddedIds.size} already embedded)...`
  )

  let done = 0
  for (const p of toEmbed) {
    const text = [
      p.name_en,
      p.name_so,
      p.description_en,
      p.description_so,
      p.brand,
      (p.tags ?? []).join(' '),
    ]
      .filter(Boolean)
      .join('. ')

    try {
      const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: 768,
      } as Parameters<typeof embeddingModel.embedContent>[0] & { outputDimensionality: number })

      const { error: upsertError } = await supabase.from('product_embeddings').upsert(
        {
          product_id: p.id,
          embedding: JSON.stringify(result.embedding.values),
          embedding_text: text,
          language: 'combined',
          model_version: 'gemini-embedding-001',
          last_embedded_at: new Date().toISOString(),
        },
        { onConflict: 'product_id,language' }
      )

      if (upsertError) throw upsertError

      done++
      const barLength = 30
      const filled = Math.round((done / toEmbed.length) * barLength)
      const bar = '#'.repeat(filled) + '-'.repeat(barLength - filled)
      console.log(`[${bar}] ${done}/${toEmbed.length}  ${p.name_en}`)
    } catch (err) {
      console.error(`  ✗ Failed to embed ${p.name_en}:`, err instanceof Error ? err.message : err)
    }

    await sleep(DELAY_MS)
  }

  console.log(`Done. Embedded ${done}/${toEmbed.length} products.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
