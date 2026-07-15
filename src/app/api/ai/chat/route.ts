import { z } from 'zod'

import { geminiFlash } from '@/lib/ai'
import { rateLimiters } from '@/lib/ratelimit'
import { getClientIp } from '@/lib/get-client-ip'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
})

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
  language: z.enum(['en', 'so']).default('en'),
})

function systemPrompt(language: 'en' | 'so'): string {
  const languageName = language === 'so' ? 'Somali' : 'English'
  return `You are a hardware store assistant for Borama Hardware in Somaliland. Help customers find products, explain building materials, and answer hardware questions. Respond in ${languageName}. Keep responses concise and practical.`
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = await rateLimiters.aiChat.limit(ip)
  if (!success) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again shortly.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const { messages, language } = parsed.data

  // Gemini's chat API takes history separately from the latest message, and
  // requires the history to start with a 'user' turn.
  const history = messages
    .slice(0, -1)
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  while (history.length > 0 && history[0].role !== 'user') history.shift()

  const latestMessage = messages[messages.length - 1]

  try {
    const chat = geminiFlash.startChat({
      history,
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt(language) }] },
    })
    const result = await chat.sendMessageStream(latestMessage.content)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) controller.enqueue(encoder.encode(text))
          }
        } catch {
          // Swallow mid-stream errors — the client just sees a shorter
          // response rather than a broken connection.
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch {
    return new Response(
      JSON.stringify({ error: 'The assistant is unavailable right now. Please try again.' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
