const CLOZE_RE = /\{\{c(\d+)::([^}]+)\}\}/g
const BLANK_MARKER = '___'

export interface ClozeSegment {
  index: number
  text: string
}

/**
 * Parse a cloze template and return all segments with their indices.
 * e.g. "{{c1::phenotype}} and {{c2::allele frequencies}}"
 *   → [{ index: 1, text: "phenotype" }, { index: 2, text: "allele frequencies" }]
 */
export function parseClozeTemplate(template: string): ClozeSegment[] {
  const segments: ClozeSegment[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(CLOZE_RE.source, 'g')
  while ((m = re.exec(template)) !== null) {
    segments.push({ index: parseInt(m[1], 10), text: m[2] })
  }
  return segments
}

/**
 * Count distinct cloze indices in a template.
 */
export function getClozeCount(template: string): number {
  return parseClozeTemplate(template).length
}

/**
 * Render a cloze card's front: blank the target cloze index,
 * reveal all other cloze segments.
 * Used when the sync script has NOT already expanded the template.
 */
export function renderBlanked(template: string, targetIndex: number): string {
  const targetRe = new RegExp(`\\{\\{c${targetIndex}::([^}]+)\\}\\}`, 'g')
  const otherRe = new RegExp(`\\{\\{c(?!${targetIndex}::)[^}]+\\}\\}`, 'g')

  return template
    .replace(targetRe, BLANK_MARKER)
    .replace(otherRe, (_, text) => text)
}

/**
 * Render a cloze card's back: reveal all cloze segments.
 * Optionally highlight the target segment with **bold** markers.
 */
export function renderRevealed(template: string, highlightIndex: number): string {
  const targetRe = new RegExp(`\\{\\{c${highlightIndex}::([^}]+)\\}\\}`, 'g')
  const otherRe = new RegExp(`\\{\\{c(?!${highlightIndex}::)[^}]+\\}\\}`, 'g')

  return template
    .replace(targetRe, (_, text) => `**${text}**`)
    .replace(otherRe, (_, text) => text)
}

/**
 * Check if a string contains cloze markers.
 */
export function hasClozeMarkers(text: string): boolean {
  return CLOZE_RE.test(text)
}
