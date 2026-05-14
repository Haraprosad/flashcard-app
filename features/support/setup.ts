import { Before, After } from '@cucumber/cucumber'
import { GlobalWindow } from 'happy-dom'
import React from 'react'
import { useAuthStore } from '../../src/stores/authStore'

// Expose React globally so source files using JSX don't need explicit imports
(global as Record<string, unknown>)['React'] = React

// ─── happy-dom global environment ───────────────────────────────────────

function setupDOM() {
  const win = new GlobalWindow({
    url: 'http://localhost/',
  }) as unknown as Record<string, unknown>

  const g = global as Record<string, unknown>
  g['window'] = win
  g['document'] = win.document
  g['localStorage'] = win.localStorage
  g['navigator'] = win.navigator
  g['location'] = win.location
  g['history'] = win.history
  g['HTMLElement'] = win.HTMLElement
  g['Element'] = win.Element
  g['Node'] = win.Node
  g['Text'] = win.Text
  g['DocumentFragment'] = win.DocumentFragment
  g['MutationObserver'] = win.MutationObserver
  g['Event'] = win.Event
  g['CustomEvent'] = win.CustomEvent
  g['MouseEvent'] = win.MouseEvent
  g['KeyboardEvent'] = win.KeyboardEvent
  g['PointerEvent'] = win.PointerEvent
  g['getComputedStyle'] = win.getComputedStyle
  g['ResizeObserver'] = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  g['requestAnimationFrame'] = (cb: FrameRequestCallback) =>
    setTimeout(cb, 16) as unknown as number
  g['cancelAnimationFrame'] = (id: number) => clearTimeout(id)

  // Minimal window.google mock for @react-oauth/google
  g['google'] = {
    accounts: {
      oauth2: {
        initTokenClient: () => ({ requestAccessToken: () => {} }),
      },
    },
  }

  // Signal React this is a test environment
  g['IS_REACT_ACT_ENVIRONMENT'] = true
}

setupDOM()

// ─── Per-scenario reset ────────────────────────────────────────────────────

Before(function () {
  useAuthStore.setState({ accessToken: null, userEmail: null })
})

After(function () {
  try {
    const doc = (global as Record<string, unknown>)['document'] as { body: { innerHTML: string } }
    doc.body.innerHTML = ''
  } catch {
    // ignore
  }
})
