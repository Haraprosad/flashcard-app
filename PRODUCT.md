# Concept Snap — Product

## Register

product

## Users

Solo learners studying personal Obsidian notes via spaced repetition. They review flashcards at night on mobile phones, often in bed, one thumb operation. Sessions are focused and short (5-15 minutes). The user is the developer themselves, deeply technical, who values tools that stay out of the way.

## Product Purpose

A personal spaced-repetition flashcard app that reads notes from an Obsidian vault stored in Google Drive and presents them in a swipeable review UI. No backend. No cross-device sync. The job is singular: show due cards, collect ratings, schedule the next review using FSRS. Success means the user completes a daily review session without friction and retains knowledge over time.

## Brand Personality

Calm, precise, premium.

Think Linear meets a high-end reading app. Understated quality: nothing screams, everything works. The interface should feel like a well-made tool you trust, not a product that demands attention. Dark by default because study happens at night. Minimal because the content (the flashcards) is the focus, not the chrome.

## Anti-references

- **Glassmorphism**: no frosted glass, no decorative blur overlays
- **Neon accents**: no glowing text or borders
- **Heavy drop shadows**: no material-design elevation system
- **Cluttered layouts**: no dashboard grids, no widget overload
- **Default Tailwind gray**: no generic `gray-100` through `gray-900` scales
- **Anki-like bare utility**: no clinical tables, no zero-animation interfaces that feel unfinished
- **Duolingo gamification**: no leaderboards, no flashy streak counters, no childish reward animations

## Design Principles

1. **Content over chrome**: The flashcard is the entire experience. Navigation, controls, and UI furniture should recede. The card text gets the best typography and the most visual weight.

2. **Frictionless flow**: Every interaction in a review session should feel instant. Tap to flip, swipe to rate, next card appears. No loading states between cards, no confirmations, no interruptions.

3. **Night-native**: Dark is not a theme toggle; it is the default and only theme. Contrast, font rendering, and touch targets are optimized for dim rooms and tired eyes.

4. **Quiet confidence**: Animations are present but restrained. Spring physics, not bounce. Ease-out curves, not elastic. Motion should feel physical and inevitable, not decorative.

5. **Mobile-first restraint**: One thumb, one hand, small screen. No hover states, no multi-column layouts, no mouse-centric interactions. Every touch target is generous (44px minimum).

## Accessibility & Inclusion

- WCAG 2.2 AA contrast minimum on all text against dark backgrounds
- All interactive elements keyboard accessible with visible focus rings
- Minimum 44x44px touch targets
- `aria-label` on all icon-only buttons
- `prefers-reduced-motion` respected: animations disabled when user preference is set
- Color is never the sole indicator of state (rating buttons use both color and text labels)
