'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { MessageCircle, Send, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MarkdownLite } from '@/components/ai/markdown-lite'
import { showErrorToast } from '@/components/ui/toast'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const MAX_MESSAGES = 20

function TypingIndicator() {
  return (
    <div className="flex gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-stone-400"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}

function ChatWidget() {
  const locale = useLocale() as 'en' | 'so'
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setInput('')
    setIsStreaming(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, language: locale }),
      })

      if (res.status === 429) {
        showErrorToast('Too many messages — please wait a moment before trying again.')
        setIsStreaming(false)
        return
      }
      if (!res.ok || !res.body) {
        showErrorToast('The assistant is unavailable right now.')
        setIsStreaming(false)
        return
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: accumulated }
          return copy
        })
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const atLimit = messages.length >= MAX_MESSAGES

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        className="fixed bottom-20 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform duration-150 hover:scale-105 active:scale-95 md:bottom-6"
      >
        {isOpen ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-36 right-6 z-40 flex h-[500px] w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-2xl md:bottom-24">
          <div className="flex items-center justify-between border-b border-stone-200 bg-orange-500 px-4 py-3">
            <p className="font-semibold text-white">Borama Hardware Assistant</p>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close chat" className="text-white/80 hover:text-white">
              <X className="size-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-sm text-stone-500">
                {locale === 'so' ? 'Sidee kuu caawin karnaa maanta?' : 'How can we help you today?'}
              </p>
            )}
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    m.role === 'user' ? 'ml-auto bg-orange-500 text-white' : 'mr-auto border border-stone-200 bg-white text-stone-800'
                  )}
                >
                  {m.content ? <MarkdownLite text={m.content} /> : isStreaming && i === messages.length - 1 ? <TypingIndicator /> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-200 p-3">
            {atLimit ? (
              <p className="text-center text-xs text-stone-500">
                {locale === 'so' ? 'Fadlan bilow wadahadal cusub.' : 'Please start a new conversation.'}
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="ml-1 font-medium text-orange-600 hover:underline"
                >
                  {locale === 'so' ? 'Bilow' : 'Start new'}
                </button>
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder={locale === 'so' ? 'Qor fariintaada...' : 'Type your message...'}
                  className="h-10 flex-1 rounded-md border border-stone-300 px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <Button size="icon" onClick={() => void sendMessage()} disabled={!input.trim() || isStreaming} aria-label="Send message">
                  <Send className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export { ChatWidget }
