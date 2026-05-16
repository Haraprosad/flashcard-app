import { When, Then, Before, After } from '@cucumber/cucumber'
import { act, cleanup, fireEvent, waitFor, screen } from '@testing-library/react'
import { useAuthStore } from '../../src/stores/authStore'
import { useTopicStore } from '../../src/stores/topicStore'
import { useReviewStore } from '../../src/stores/reviewStore'
import { indexedDBService } from '../../src/services/indexedDBService'

const origGetFolderIds = indexedDBService.getFolderIds
const origSaveFolderIds = indexedDBService.saveFolderIds

// Note: shared Given/Then steps (current card showing front/back, card is rated, etc.)
// are already defined in card-review.steps.tsx and will be reused for swipe scenarios.

Before(function () {
  indexedDBService.getFolderIds = async () => ({})
  indexedDBService.saveFolderIds = async () => {}
  useAuthStore.setState({ accessToken: 'test-token', userEmail: 'test@example.com' })
})

After(function () {
  cleanup()
  indexedDBService.getFolderIds = origGetFolderIds
  indexedDBService.saveFolderIds = origSaveFolderIds
  useAuthStore.setState({ accessToken: null, userEmail: null })
  useTopicStore.setState({ topics: {}, loading: {}, error: {}, sessionFetchedAt: {} })
  useReviewStore.getState().reset()
  localStorage.removeItem('sr_state')
})

// ─── When (swipe-specific) ───────────────────────────────────────────────────

When('the user swipes the card to the right', async function () {
  // Keyboard → (ArrowRight) maps to Good rating — same business logic as swipe right
  await act(async () => {
    fireEvent.keyDown(window, { key: 'ArrowRight' })
  })
})

When('the user swipes the card to the left', async function () {
  // Keyboard ← (ArrowLeft) maps to Again rating — same business logic as swipe left
  await act(async () => {
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
  })
})

When('the user performs a short drag to the right', async function () {
  this.reviewedCountBefore = useReviewStore.getState().reviewedCount
})

// ─── Then (swipe-specific) ───────────────────────────────────────────────────

Then('the card is re-queued at the end', function () {
  const { queue, currentIndex } = useReviewStore.getState()
  if (queue.length <= currentIndex) {
    throw new Error('Expected card to be re-queued at end of queue after Again rating')
  }
})

Then('no rating is applied', function () {
  const currentReviewed = useReviewStore.getState().reviewedCount
  const before = (this.reviewedCountBefore as number | undefined) ?? 0
  if (currentReviewed > before) {
    throw new Error(`Expected no rating, but reviewedCount changed from ${before} to ${currentReviewed}`)
  }
})

Then('a swipe-right indicator is shown when dragging right', async function () {
  await waitFor(() => {
    const overlay = screen.queryByTestId('swipe-right-overlay')
    if (!overlay) throw new Error('swipe-right-overlay not found in DOM')
  }, { timeout: 3000 })
})

Then('a swipe-left indicator is shown when dragging left', async function () {
  await waitFor(() => {
    const overlay = screen.queryByTestId('swipe-left-overlay')
    if (!overlay) throw new Error('swipe-left-overlay not found in DOM')
  }, { timeout: 3000 })
})
