import React from 'react'

// ─── Token types ──────────────────────────────────────────────────────────────

type Token =
  | { type: 'text';      content: string }
  | { type: 'bold';      content: string }
  | { type: 'italic';    content: string }
  | { type: 'code';      content: string }
  | { type: 'highlight'; content: string }
  | { type: 'wikilink';  label: string }

/**
 * Tokenises a single line of text into inline markdown tokens.
 *
 * Handles (in priority order to avoid double-matches):
 *   **bold**     →  <strong>
 *   ==highlight==→  <mark class="obs-hl">   (Obsidian)
 *   [[link|alias]] / [[link]]  →  <span class="obs-wiki">  (Obsidian)
 *   *italic*     →  <em>
 *   `code`       →  <code>
 */
function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  const re =
    /(\*\*[^*\n]+\*\*|==[^=\n]+==|\[\[[^\]|]+(?:\|[^\]]+)?\]\]|\*[^*\n]+\*|`[^`\n]+`)/g

  let last = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      tokens.push({ type: 'text', content: line.slice(last, match.index) })
    }

    const raw = match[0]

    if (raw.startsWith('**')) {
      tokens.push({ type: 'bold', content: raw.slice(2, -2) })
    } else if (raw.startsWith('==')) {
      tokens.push({ type: 'highlight', content: raw.slice(2, -2) })
    } else if (raw.startsWith('[[')) {
      const inner   = raw.slice(2, -2)
      const pipeIdx = inner.indexOf('|')
      const label   = pipeIdx >= 0 ? inner.slice(pipeIdx + 1) : inner
      tokens.push({ type: 'wikilink', label })
    } else if (raw.startsWith('*')) {
      tokens.push({ type: 'italic', content: raw.slice(1, -1) })
    } else {
      tokens.push({ type: 'code', content: raw.slice(1, -1) })
    }

    last = match.index + raw.length
  }

  if (last < line.length) {
    tokens.push({ type: 'text', content: line.slice(last) })
  }

  return tokens
}

// ─── Rendering helpers ────────────────────────────────────────────────────────

const codeStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: '0.82em',
  backgroundColor: 'rgba(255,255,255,0.07)',
  padding: '1px 6px',
  borderRadius: '4px',
  color: 'var(--accent)',
  letterSpacing: '-0.01em',
}

function renderTokens(tokens: Token[], boldColor?: string) {
  return tokens.map((token, i) => {
    switch (token.type) {
      case 'bold':
        return (
          <strong key={i} style={{ fontWeight: 700, color: boldColor ?? 'inherit' }}>
            {token.content}
          </strong>
        )
      case 'italic':
        return <em key={i}>{token.content}</em>
      case 'code':
        return <code key={i} style={codeStyle}>{token.content}</code>
      case 'highlight':
        return <mark key={i} className="obs-hl">{token.content}</mark>
      case 'wikilink':
        return <span key={i} className="obs-wiki">{token.label}</span>
      default:
        return <span key={i}>{token.content}</span>
    }
  })
}

// ─── Public component ─────────────────────────────────────────────────────────

interface MarkdownTextProps {
  /**
   * Raw text, may contain **bold**, *italic*, `code`,
   * ==highlight==, [[wikilinks]], and \n newlines.
   * Inline-only — safe to nest inside a <p> or button.
   */
  text: string
  /**
   * Optional colour override for **bold** segments.
   * Pass `'var(--accent)'` in ClozeBack for amber revealed text.
   */
  boldColor?: string
}

/**
 * Renders inline Obsidian markdown as React elements.
 * Emits only inline elements (span, strong, em, code, mark, br) —
 * safe to nest inside a <p>, <button>, or <h2>.
 *
 * For full block-level rendering (lists, callouts, code fences),
 * use ObsidianMarkdown instead.
 */
export function MarkdownText({ text, boldColor }: MarkdownTextProps) {
  const lines = text.split('\n')

  return (
    <>
      {lines.map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {renderTokens(tokenizeLine(line), boldColor)}
        </React.Fragment>
      ))}
    </>
  )
}
