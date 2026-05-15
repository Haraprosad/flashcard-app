---
name: Obsidian Flashcard App
description: Personal spaced-repetition study app. Night-native, mobile-first, dark minimal.
colors:
  amber-accent: "#F59E0B"
  amber-muted: "#78400A"
  base-black: "#0E0E10"
  surface-zinc: "#18181B"
  elevated-graphite: "#222227"
  border-dim: "#2E2E35"
  text-bright: "#F4F4F5"
  text-secondary: "#A1A1AA"
  text-muted: "#52525B"
  rating-again: "#EF4444"
  rating-hard: "#F97316"
  rating-good: "#22C55E"
  rating-easy: "#3B82F6"
typography:
  display:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "clamp(1.75rem, 5vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.2
  headline:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.05em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  card: "12px"
  btn: "8px"
  badge: "6px"
  sheet: "20px"
spacing:
  unit-4: "4px"
  unit-8: "8px"
  unit-12: "12px"
  unit-16: "16px"
  unit-24: "24px"
  unit-32: "32px"
  unit-48: "48px"
  unit-64: "64px"
components:
  card-surface:
    backgroundColor: "{colors.surface-zinc}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.card}"
    padding: "24px"
  btn-primary:
    backgroundColor: "{colors.amber-accent}"
    textColor: "{colors.base-black}"
    rounded: "{rounded.btn}"
    padding: "12px 24px"
  btn-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.btn}"
    padding: "12px 24px"
  rating-again:
    backgroundColor: "{colors.rating-again}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.btn}"
    padding: "12px 24px"
  rating-hard:
    backgroundColor: "{colors.rating-hard}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.btn}"
    padding: "12px 24px"
  rating-good:
    backgroundColor: "{colors.rating-good}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.btn}"
    padding: "12px 24px"
  rating-easy:
    backgroundColor: "{colors.rating-easy}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.btn}"
    padding: "12px 24px"
---

# Design System: Obsidian Flashcard App

## 1. Overview

**Creative North Star: "The Midnight Desk Lamp"**

A pool of warm amber light on a dark desk. Everything outside the light recedes; the card in front of you is all that matters. The interface is the desk lamp: it illuminates the content and gets out of the way. No decorative chrome, no visual noise, no features that interrupt the study session. The dark background is not aesthetic choice; it is functional. Tired eyes at midnight need contrast without glare.

The system is restrained by conviction, not by default. Amber (#F59E0B) is the only saturated color, and it earns its place on primary actions and active states. Everything else is tinted neutral: zinc surfaces, graphite borders, dim text. The palette has exactly four semantic colors (Again, Hard, Good, Easy) and they appear only during card rating, where color meaning matters.

Typography carries the personality. DM Serif Display gives headings warmth and gravitas without shouting. DM Sans is the workhorse, clean at body size and legible at label size. The pairing says "serious tool" not "tech startup."

**Key Characteristics:**
- Dark base (#0E0E10) with warm amber accent; no other saturated colors at rest
- Tonal layering for depth (base → surface → elevated), no drop shadows
- 0.5px borders for separation, never heavy outlines
- Spring-based motion: physical, not decorative; max 500ms (card flip and page transitions excepted)
- Mobile-first, one-thumb operation: 44px minimum touch targets, no hover-only interactions

## 2. Colors

Monochromatic dark surface palette with one warm accent. Color is information, not decoration.

### Primary
- **Warm Amber** (#F59E0B): The singular accent. Used exclusively on primary action buttons, active navigation, and focus rings. Its warmth against the cool dark base creates the "desk lamp" effect. Never used as background fill or text color on large areas.
- **Dim Amber** (#78400A): Muted variant for hover states, subtle highlights, and secondary emphasis. Desaturated enough to sit on dark surfaces without glowing.

### Semantic (rating)
- **Again Red** (#EF4444): Card rated "Again." Lapse signal. Used on button background during rating.
- **Hard Orange** (#F97316): Card rated "Hard." Difficulty signal.
- **Good Green** (#22C55E): Card rated "Good." Success signal.
- **Easy Blue** (#3B82F6): Card rated "Easy." Mastery signal.

These four colors appear only in the RatingBar and swipe overlay. They do not appear elsewhere in the UI.

### Neutral
- **Base Black** (#0E0E10): Root background. The deepest layer. All pages sit on this.
- **Surface Zinc** (#18181B): Card backgrounds, modal surfaces, bottom sheets. One step up from base.
- **Elevated Graphite** (#222227): Hovered states, active surfaces, elevated containers. Two steps up.
- **Dim Border** (#2E2E35): Separation lines, card borders, dividers. Always 0.5px.
- **Bright Text** (#F4F4F5): Primary text color. Headings, body copy, active labels.
- **Secondary Text** (#A1A1AA): Supporting text, descriptions, timestamps. Readable but receding.
- **Muted Text** (#52525B): Placeholder text, disabled states, tertiary information. Minimum contrast against base for WCAG AA.

**The One Light Rule.** Amber is the only warm, saturated color on any screen at rest. The four semantic rating colors appear only during active rating interaction and disappear immediately after. Two color systems, never overlapping.

**The Tinted Neutral Rule.** All neutrals carry a faint warm tint. Pure gray (#808080) is prohibited. The zinc undertone ensures the palette coheres as a deliberate dark theme, not a generic dark mode toggle.

## 3. Typography

**Display Font:** DM Serif Display (fallback: Georgia)
**Body Font:** DM Sans (fallback: system sans-serif)
**Code Font:** JetBrains Mono (fallback: system monospace)

**Character:** Serif display for gravitas, sans body for clarity. The serif gives headings warmth without decorative weight. The sans is engineered for screen legibility at all sizes. The pairing reads as "considered tool" not "styled product."

### Hierarchy
- **Display** (400, clamp(1.75rem, 5vw, 2.5rem), 1.2): Page titles, session complete heading. Used once per screen maximum.
- **Headline** (600, 1.5rem, 1.3): Section headings, card topic labels. Used sparingly.
- **Title** (500, 1.125rem, 1.4): Card headers, list item titles, button text.
- **Body** (400, 1rem, 1.6): Flashcard content, descriptions, paragraph text. Capped at 65-75ch.
- **Label** (500, 0.75rem, 0.05em, uppercase): Badge text, metadata, category tags. Always uppercase with tracking.
- **Mono** (400, 0.875rem, 1.5): Code snippets within cards, technical metadata.

**The Serif-Once Rule.** DM Serif Display appears on at most one element per screen. Overuse collapses the hierarchy and dilutes the warmth.

**The 65ch Rule.** Body text line length never exceeds 75 characters. Flashcard content is the primary reading experience; long lines destroy comprehension on mobile.

## 4. Elevation

This system uses tonal layering, not shadows. Depth is conveyed by stepping through three surface levels: base (#0E0E10) → surface (#18181B) → elevated (#222227). Each step adds ~7% lightness. No drop shadows anywhere in the system.

The only visual separation between layers is the 0.5px border in Dim Border (#2E2E35). Borders are structural, not decorative; they mark the edge of an interactive element.

**The Flat Surface Rule.** Surfaces are flat at rest. Elevation is expressed through tonal value, not through shadow or blur. If two elements overlap, the one closer to the user is lighter, not shadowed.

## 5. Components

### Buttons
- **Shape:** Rounded rectangle (8px radius). Minimum 44px height for touch.
- **Primary:** Amber (#F59E0B) background, Base Black (#0E0E10) text. Font weight 500. Padding 12px 24px. Used for the single most important action per screen.
- **Ghost:** Transparent background, Secondary Text (#A1A1AA) text. Same shape and sizing. Used for secondary actions and navigation.
- **Rating (4 variants):** Semantic color background (Again/Hard/Good/Easy), Bright Text. Staggered entrance after card flip (50ms stagger). Scale 1 → 0.95 on press, color flash on release.
- **Focus:** Amber (#F59E0B) 2px outline, 2px offset. Always visible on keyboard focus. Never `outline: none` without this replacement.

### Cards / Flashcard
- **Corner Style:** 12px radius.
- **Background:** Surface Zinc (#18181B).
- **Border:** 0.5px solid Dim Border (#2E2E35).
- **Internal Padding:** 24px.
- **Behavior:** 3D Y-axis flip to reveal back. Duration 0.4s, ease [0.23, 1, 0.32, 1]. Scale 0.95 → 1 on entry after previous card exit.

### Bottom Sheet
- **Corner Style:** 20px radius on top edges.
- **Background:** Surface Zinc (#18181B).
- **Border:** 0.5px solid Dim Border (#2E2E35) on top edge only.

### Navigation
- **Style:** Minimal tab bar or bottom navigation on mobile. Ghost button styling for inactive tabs, amber accent for active.
- **Typography:** Label style (12px, 500, uppercase, 0.05em tracking).

### Heatmap
- **Style:** Grid of small cells, each representing one day. Staggered fade-in (2ms delay per cell).
- **Colors:** Muted Text (#52525B) for empty, scaled green intensity for review counts.

### Swipe Overlay
- **Behavior:** During horizontal drag, tinted overlay appears. Green tint for right swipe (Good), red tint for left swipe (Again). Card rotates max ±15 degrees.

## 6. Do's and Don'ts

### Do:
- **Do** use amber (#F59E0B) as the sole accent color for all interactive highlights, focus rings, and primary buttons.
- **Do** express elevation through tonal layering (base → surface → elevated), never through drop shadows.
- **Do** use DM Serif Display for display headings, maximum once per screen.
- **Do** cap body text at 75 characters per line for comfortable reading on mobile.
- **Do** use spring animations (stiffness: 400, damping: 30) for interactive feedback; ease-out curves for state transitions.
- **Do** wrap all animations in `@media (prefers-reduced-motion: no-preference)`.
- **Do** maintain 44px minimum touch targets for all interactive elements.
- **Do** use 0.5px borders for subtle separation between surfaces.

### Don't:
- **Don't** use glassmorphism, frosted glass effects, or decorative blur overlays. The anti-reference from PRODUCT.md: "no frosted glass, no decorative blur overlays."
- **Don't** use neon accents, glowing text, or bright borders. Amber is warm, not electric.
- **Don't** use heavy drop shadows for elevation. The system is tonal, not shadowed.
- **Don't** use default Tailwind gray scales. All neutrals are custom-tinted zinc values.
- **Don't** use Inter, Roboto, Arial, or Space Grotesk. The font pairing is DM Serif Display + DM Sans, full stop.
- **Don't** create cluttered dashboard layouts or widget overload. One card, one focus.
- **Don't** build hover-only interactions. Mobile-first means touch is primary.
- **Don't** use color as the sole indicator of state. Rating buttons carry both color and text labels (Again/Hard/Good/Easy).
- **Don't** animate CSS layout properties. Use transform and opacity only.
- **Don't** use bounce or elastic easing curves. Ease-out quart/quint/expo only.
