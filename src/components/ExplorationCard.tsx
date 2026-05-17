import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExplorationStep, ConfidenceRating, ExplorationResult } from '../types'
import { MarkdownText } from './MarkdownText'
import { ObsidianMarkdown } from './ObsidianMarkdown'

interface ExplorationCardProps {
  steps: ExplorationStep[]
  /** Called when the user completes the exploration (includes result metadata) */
  onComplete: (result: ExplorationResult) => void
  onSkip: () => void
  /** conceptId of the card — required to build ExplorationResult */
  conceptId?: string
}

type ChallengeState = 'idle' | 'correct' | 'wrong'
type ExplanationState = 'hidden' | 'revealed'

export function ExplorationCard({ steps, onComplete, onSkip, conceptId }: ExplorationCardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [freeText, setFreeText] = useState('')
  const [challengeState, setChallengeState] = useState<ChallengeState>('idle')
  const [explanationState, setExplanationState] = useState<ExplanationState>('hidden')

  // 16.1 — Confidence calibration
  const [confidenceRating, setConfidenceRating] = useState<ConfidenceRating | null>(null)

  // 16.5 — First-attempt tracking
  const [attemptCount, setAttemptCount] = useState(0)
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState<boolean | null>(null)

  // 16.4 — Skip friction overflow menu
  const [showOverflowMenu, setShowOverflowMenu] = useState(false)

  const currentStep = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  function handleNext() {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1)
      setSelectedOption(null)
      setFreeText('')
      setChallengeState('idle')
      setExplanationState('hidden')
      setConfidenceRating(null)
      setAttemptCount(0)
    }
  }

  function handleCheckAnswer() {
    if (!currentStep) return
    const step = currentStep

    const isCorrect = step.challenge_input
      ? freeText.trim().toLowerCase() === (step.challenge_options?.[step.challenge_answer ?? 0] ?? '').trim().toLowerCase()
      : selectedOption === step.challenge_answer

    // 16.5 — record first attempt
    const newAttemptCount = attemptCount + 1
    setAttemptCount(newAttemptCount)
    if (attemptCount === 0) {
      setFirstAttemptCorrect(isCorrect)
    }

    setChallengeState(isCorrect ? 'correct' : 'wrong')
    setExplanationState('hidden') // reset explanation on each attempt
  }

  function handleTryAgain() {
    setSelectedOption(null)
    setFreeText('')
    setChallengeState('idle')
    setExplanationState('hidden')
    // confidence can persist — only re-selecting answer resets it
  }

  function buildResult(): ExplorationResult {
    return {
      conceptId: conceptId ?? '',
      confidenceRating,
      firstAttemptCorrect,
    }
  }

  function handleComplete() {
    onComplete(buildResult())
  }

  function handleSkipConfirm() {
    setShowOverflowMenu(false)
    onSkip()
  }

  const stepVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  }

  return (
    <div
      data-testid="exploration-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        gap: '24px',
        position: 'relative',
      }}
    >
      {/* 16.4 — Overflow menu button (top-right, above content) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Step indicator */}
        <StepIndicator steps={steps} currentIndex={stepIndex} />

        {/* ⋯ menu button */}
        <div style={{ position: 'relative' }}>
          <motion.button
            type="button"
            data-testid="exploration-overflow-menu"
            aria-label="More options"
            onClick={() => setShowOverflowMenu((v) => !v)}
            whileTap={{ scale: 0.9 }}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ⋯
          </motion.button>

          {/* Skip confirmation popover */}
          <AnimatePresence>
            {showOverflowMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: '48px',
                  right: 0,
                  zIndex: 10,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  width: '240px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span
                    style={{
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Skip building the mental model?
                  </span>
                  <span
                    style={{
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    Your flashcards will unlock, but the concept won&apos;t be anchored.
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <motion.button
                    type="button"
                    data-testid="skip-confirm-cancel"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowOverflowMenu(false)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--accent)',
                      color: '#000',
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    Keep going
                  </motion.button>
                  <motion.button
                    type="button"
                    data-testid="skip-confirm-proceed"
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSkipConfirm}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--bg-border)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '14px',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    Skip anyway
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="sync">
        <motion.div
          key={stepIndex}
          data-testid={`exploration-step-${currentStep?.kind}`}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {currentStep && (
            <>
              <h2
                style={{
                  fontFamily: 'DM Serif Display, serif',
                  fontSize: 'clamp(20px, 4vw, 26px)',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                <MarkdownText text={currentStep.title} />
              </h2>

              <ObsidianMarkdown text={currentStep.body} />

              {/* Challenge-specific UI */}
              {currentStep.kind === 'challenge' && challengeState !== 'correct' && (
                <ChallengeInput
                  step={currentStep}
                  selectedOption={selectedOption}
                  freeText={freeText}
                  challengeState={challengeState}
                  confidenceRating={confidenceRating}
                  explanationState={explanationState}
                  onSelectOption={setSelectedOption}
                  onFreeTextChange={setFreeText}
                  onCheckAnswer={handleCheckAnswer}
                  onTryAgain={handleTryAgain}
                  onSelectConfidence={setConfidenceRating}
                  onRevealExplanation={() => setExplanationState('revealed')}
                />
              )}

              {challengeState === 'correct' && (
                <ChallengeSuccess onStartFlashcards={handleComplete} />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom navigation — non-challenge steps only */}
      {currentStep?.kind !== 'challenge' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <motion.button
            type="button"
            onClick={isLastStep ? handleComplete : handleNext}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '14px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: '#000',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            {isLastStep ? 'Start flashcards' : 'Next →'}
          </motion.button>
        </div>
      )}
    </div>
  )
}

// ─── StepIndicator ──────────────────────────────────────────────────────────

function StepIndicator({
  steps,
  currentIndex,
}: {
  steps: ExplorationStep[]
  currentIndex: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
      }}
      role="list"
      aria-label="Step progress"
    >
      {steps.map((_, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <motion.div
            key={i}
            data-testid={`step-dot-${i}`}
            data-done={isDone ? 'true' : 'false'}
            data-current={isCurrent ? 'true' : 'false'}
            role="listitem"
            aria-label={isDone ? `Step ${i + 1} completed` : isCurrent ? `Step ${i + 1} current` : `Step ${i + 1} upcoming`}
            animate={{
              backgroundColor: isDone
                ? 'var(--accent)'
                : isCurrent
                ? 'transparent'
                : 'var(--bg-elevated)',
              borderColor: isDone || isCurrent ? 'var(--accent)' : 'var(--bg-border)',
            }}
            transition={{ duration: 0.25 }}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: '2px solid',
              flexShrink: 0,
            }}
          />
        )
      })}
    </div>
  )
}

// ─── ChallengeInput ─────────────────────────────────────────────────────────

interface ChallengeInputProps {
  step: ExplorationStep
  selectedOption: number | null
  freeText: string
  challengeState: ChallengeState
  confidenceRating: ConfidenceRating | null
  explanationState: ExplanationState
  onSelectOption: (i: number) => void
  onFreeTextChange: (v: string) => void
  onCheckAnswer: () => void
  onTryAgain: () => void
  onSelectConfidence: (r: ConfidenceRating) => void
  onRevealExplanation: () => void
}

function ChallengeInput({
  step,
  selectedOption,
  freeText,
  challengeState,
  confidenceRating,
  explanationState,
  onSelectOption,
  onFreeTextChange,
  onCheckAnswer,
  onTryAgain,
  onSelectConfidence,
  onRevealExplanation,
}: ChallengeInputProps) {
  const canCheck = step.challenge_input ? freeText.trim().length > 0 : selectedOption !== null
  // Options are disabled (pointer-events: none) until confidence is selected
  const optionsLocked = confidenceRating === null

  const CONFIDENCE_OPTIONS: { label: string; value: ConfidenceRating; testId: string }[] = [
    { label: 'Low', value: 'low', testId: 'confidence-low' },
    { label: 'Medium', value: 'medium', testId: 'confidence-medium' },
    { label: 'High', value: 'high', testId: 'confidence-high' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 16.1 — Confidence row: shown BEFORE options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span
          style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          How confident are you?
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {CONFIDENCE_OPTIONS.map(({ label, value, testId }) => {
            const isSelected = confidenceRating === value
            return (
              <motion.button
                key={value}
                type="button"
                data-testid={testId}
                whileTap={{ scale: 0.96 }}
                onClick={() => onSelectConfidence(value)}
                aria-pressed={isSelected}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: '8px',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--bg-border)'}`,
                  backgroundColor: isSelected
                    ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                    : 'var(--bg-elevated)',
                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                  minHeight: '44px',
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              >
                {label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Options / text input — locked until confidence selected */}
      <div
        data-testid="challenge-options-container"
        style={{
          opacity: optionsLocked ? 0.45 : 1,
          pointerEvents: optionsLocked ? 'none' : 'auto',
          transition: 'opacity 0.2s',
        }}
        aria-disabled={optionsLocked}
      >
        {step.challenge_input ? (
          <input
            type="text"
            value={freeText}
            onChange={(e) => onFreeTextChange(e.target.value)}
            placeholder="Type your answer…"
            aria-label="Challenge answer input"
            disabled={optionsLocked}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              outline: 'none',
              minHeight: '44px',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(step.challenge_options ?? []).map((opt, i) => (
              <motion.button
                key={i}
                type="button"
                whileTap={optionsLocked ? {} : { scale: 0.97 }}
                onClick={() => !optionsLocked && onSelectOption(i)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${selectedOption === i ? 'var(--accent)' : 'var(--bg-border)'}`,
                  backgroundColor: selectedOption === i
                    ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                    : 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '15px',
                  cursor: optionsLocked ? 'default' : 'pointer',
                  textAlign: 'left',
                  minHeight: '44px',
                }}
              >
                <MarkdownText text={opt} />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* 16.2 — Wrong answer state: immediate header, delayed explanation */}
      {challengeState === 'wrong' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '14px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid color-mix(in srgb, var(--color-again) 30%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-again) 10%, transparent)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              color: 'var(--color-again)',
            }}
          >
            No, you are wrong ✗
          </span>

          {/* 16.2 — Explanation hidden by default; revealed on button tap */}
          {step.challenge_explanation && explanationState === 'hidden' && (
            <motion.button
              type="button"
              data-testid="see-why-button"
              whileTap={{ scale: 0.97 }}
              onClick={onRevealExplanation}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid color-mix(in srgb, var(--color-again) 40%, transparent)',
                backgroundColor: 'transparent',
                color: 'var(--color-again)',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
                alignSelf: 'flex-start',
              }}
            >
              See why →
            </motion.button>
          )}

          {step.challenge_explanation && explanationState === 'revealed' && (
            <motion.div
              data-testid="challenge-explanation"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ObsidianMarkdown text={step.challenge_explanation} className="obs-md--explanation" />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Action button */}
      {challengeState === 'wrong' ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onTryAgain}
          style={{
            padding: '14px 24px',
            borderRadius: '8px',
            border: '1px solid var(--bg-border)',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Try again
        </motion.button>
      ) : (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onCheckAnswer}
          disabled={!canCheck || optionsLocked}
          style={{
            padding: '14px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: canCheck && !optionsLocked ? 'var(--accent)' : 'var(--bg-elevated)',
            color: canCheck && !optionsLocked ? '#000' : 'var(--text-muted)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            cursor: canCheck && !optionsLocked ? 'pointer' : 'not-allowed',
            minHeight: '44px',
          }}
        >
          Check answer
        </motion.button>
      )}
    </div>
  )
}

// ─── ChallengeSuccess ───────────────────────────────────────────────────────

function ChallengeSuccess({ onStartFlashcards }: { onStartFlashcards: () => void }) {
  return (
    <motion.div
      data-testid="challenge-success"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid color-mix(in srgb, var(--color-good) 30%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--color-good) 10%, transparent)',
      }}
    >
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--color-good)',
        }}
      >
        Well done!
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onStartFlashcards}
        style={{
          padding: '14px 24px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'var(--accent)',
          color: '#000',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: '44px',
        }}
      >
        Start flashcards
      </motion.button>
    </motion.div>
  )
}
