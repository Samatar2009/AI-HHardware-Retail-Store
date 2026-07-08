import { GoogleGenerativeAI } from '@google/generative-ai'

import { env } from './env'

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

export const geminiPro = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
export const geminiFlash = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

export async function embedText(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text)
  return result.embedding.values
}
