// Minimal, dependency-free renderer for the small subset of markdown Gemini
// tends to produce in chat responses (bold, bullet lines, line breaks).
// Deliberately does not use dangerouslySetInnerHTML — everything is built
// as React text nodes, so there's no HTML-injection surface even if the
// model is coaxed into echoing back markup.
function renderInlineBold(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>
  })
}

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trimStart()
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ')
        const content = isBullet ? trimmed.slice(2) : line

        return (
          <span key={i} className="block">
            {isBullet && <span className="mr-1">•</span>}
            {renderInlineBold(content, String(i))}
          </span>
        )
      })}
    </>
  )
}

export { MarkdownLite }
