import { GoogleGenerativeAI, type EmbedContentRequest } from '@google/generative-ai'

import { env } from './env'

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

// gemini-1.5-pro / gemini-1.5-flash / text-embedding-004 (Tech Stack doc's
// original pins) were retired by Google; their pinned successors
// gemini-2.5-pro / gemini-2.5-flash have now *also* been retired ("no
// longer available to new users") — the second such retirement in this
// project. Pinning to a dated model name keeps rotting, so this uses
// Google's "-latest" aliases instead, which are meant to track whatever
// model is currently recommended without needing a code change each time.
export const geminiPro = genAI.getGenerativeModel({ model: 'gemini-pro-latest' })
export const geminiFlash = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })

// The embedding column is pgvector(768) (sized for the retired
// text-embedding-004's native output). gemini-embedding-001 defaults to a
// larger dimension but supports truncating via outputDimensionality, which
// keeps the existing schema and match_products_semantic() untouched.
export async function embedText(text: string): Promise<number[]> {
  const request: EmbedContentRequest & { outputDimensionality: number } = {
    content: { role: 'user', parts: [{ text }] },
    outputDimensionality: 768,
  }
  const result = await embeddingModel.embedContent(request)
  return result.embedding.values
}
