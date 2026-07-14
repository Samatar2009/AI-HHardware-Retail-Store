import { beforeEach, describe, expect, it, vi } from 'vitest'

const embedContent = vi.fn()
const getGenerativeModel = vi.fn((config: { model: string }) => ({
  model: config.model,
  embedContent,
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({ getGenerativeModel })),
}))

describe('ai module', () => {
  beforeEach(() => {
    vi.resetModules()
    embedContent.mockReset()
    getGenerativeModel.mockClear()
  })

  it('initializes distinct models for pro, flash, and embeddings', async () => {
    await import('@/lib/ai')

    const requestedModels = getGenerativeModel.mock.calls.map((call) => call[0].model)
    expect(requestedModels).toContain('gemini-pro-latest')
    expect(requestedModels).toContain('gemini-flash-latest')
    expect(requestedModels).toContain('gemini-embedding-001')
  })

  it('embedText requests a 768-dimension vector and returns the embedding values', async () => {
    embedContent.mockResolvedValue({ embedding: { values: [0.1, 0.2, 0.3] } })
    const { embedText } = await import('@/lib/ai')

    const result = await embedText('Portland Cement 50kg Bag')

    expect(embedContent).toHaveBeenCalledWith(
      expect.objectContaining({
        outputDimensionality: 768,
        content: { role: 'user', parts: [{ text: 'Portland Cement 50kg Bag' }] },
      })
    )
    expect(result).toEqual([0.1, 0.2, 0.3])
  })
})
