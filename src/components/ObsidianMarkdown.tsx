import { useMemo } from 'react'
import { marked } from 'marked'

// ─── Configure marked once (module-level) ────────────────────────────────────

marked.use({
  gfm: true,     // GitHub Flavored Markdown: tables, task lists, strikethrough
  breaks: true,  // \n → <br> for Obsidian-style line breaks
})

// ─── Obsidian-specific pre-processing ────────────────────────────────────────

/**
 * Converts Obsidian-only syntax to HTML/standard markdown before marked sees it:
 *   ==highlight==  →  <mark class="obs-hl">...</mark>
 *   [[page|alias]] →  <span class="obs-wiki">alias</span>
 *   [[page]]       →  <span class="obs-wiki">page</span>
 */
function preprocessObsidian(text: string): string {
  return text
    .replace(/==([^=\n]+)==/g, '<mark class="obs-hl">$1</mark>')
    .replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_: string, link: string, alias?: string) =>
        `<span class="obs-wiki">${alias ?? link}</span>`,
    )
}

// ─── Obsidian callout post-processing ────────────────────────────────────────
// marked converts "> [!NOTE] Title" into a <blockquote><p>[!NOTE] Title</p>...
// We convert those into styled callout <div>s.

const CALLOUT_ICONS: Record<string, string> = {
  note:     '📝',
  tip:      '💡',
  info:     'ℹ️',
  warning:  '⚠️',
  danger:   '🔥',
  caution:  '⚠️',
  success:  '✅',
  question: '❓',
  example:  '📋',
  quote:    '💬',
  abstract: '📄',
  bug:      '🐛',
  failure:  '❌',
  todo:     '☑️',
}

function processCallouts(html: string): string {
  return html.replace(
    /<blockquote>\s*<p>\[!([\w]+)\](.*?)<\/p>([\s\S]*?)<\/blockquote>/gi,
    (_: string, type: string, titleRaw: string, body: string) => {
      const t      = type.toLowerCase()
      const icon   = CALLOUT_ICONS[t] ?? '📝'
      const label  = titleRaw.trim() || (t.charAt(0).toUpperCase() + t.slice(1))
      return (
        `<div class="obs-callout obs-callout-${t}" role="note">` +
          `<div class="obs-callout-title"><span aria-hidden="true">${icon}</span> ${label}</div>` +
          `<div class="obs-callout-body">${body.trim()}</div>` +
        `</div>`
      )
    },
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ObsidianMarkdownProps {
  /** Raw Obsidian-flavored markdown text */
  text: string
  /**
   * Extra className to merge onto the root <div>.
   * Use this to override font-size or max-width per call-site.
   */
  className?: string
}

/**
 * Renders a full block of Obsidian-flavored Markdown.
 *
 * Supported syntax:
 *   **bold**, *italic*, ~~strikethrough~~, `code`, ==highlight==
 *   [[wikilinks]], headings, ordered/unordered/task lists,
 *   fenced code blocks, blockquotes, Obsidian callouts (> [!NOTE] etc.)
 *
 * Emits block-level HTML — place inside a <div>, NOT a <p>.
 *
 * Content comes from the user's own Obsidian vault (controlled source),
 * so dangerouslySetInnerHTML is safe in this context.
 */
export function ObsidianMarkdown({ text, className = '' }: ObsidianMarkdownProps) {
  const html = useMemo(() => {
    const preprocessed = preprocessObsidian(text)
    const raw          = marked.parse(preprocessed) as string
    return processCallouts(raw)
  }, [text])

  return (
    <div
      className={`obs-md${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
