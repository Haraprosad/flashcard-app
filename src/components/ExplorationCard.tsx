import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExplorationStep } from '../types'
import { MarkdownText } from './MarkdownText'
import { ObsidianMarkdown } from './ObsidianMarkdown'

interface ExplorationCardProps {
  steps: ExplorationStep[]
  onComplete: () => void
  onSkip: () => void
}

type ChallengeState = 'idle' | 'correct' | 'wrong'

export function ExplorationCard({ steps, onComplete, onSkip }: ExplorationCardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [freeText, setFreeText] = useState('')
  const [challengeState, setChallengeState] = useState<ChallengeState>('idle')

  const currentStep = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  function handleNext() {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1)
      setSelectedOption(null)
      setFreeText('')
      setChallengeState('idle')
    }
  }

  function handleCheckAnswer() {
    if (!currentStep) return
    const step = currentStep

    if (step.challenge_input) {
      const correct = step.challenge_options?.[step.challenge_answer ?? 0] ?? ''
      const isCorrect = freeText.trim().toLowerCase() === correct.trim().toLowerCase()
      setChallengeState(isCorrect ? 'correct' : 'wrong')
    } else {
      const isCorrect = selectedOption === step.challenge_answer
      setChallengeState(isCorrect ? 'correct' : 'wrong')
    }
  }

  function handleTryAgain() {
    setSelectedOption(null)
    setFreeText('')
    setChallengeState('idle')
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
      }}
    >
      {/* Step indicator */}
      <StepIndicator steps={steps} currentIndex={stepIndex} />

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
                  onSelectOption={setSelectedOption}
                  onFreeTextChange={setFreeText}
                  onCheckAnswer={handleCheckAnswer}
                  onTryAgain={handleTryAgain}
                />
              )}

              {challengeState === 'correct' && (
                <ChallengeSuccess onStartFlashcards={onComplete} />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom navigation */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {currentStep?.kind !== 'challenge' && (
          <motion.button
            type="button"
            onClick={isLastStep ? onComplete : handleNext}
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
        )}

        <a
          href="#"
          role="link"
          onClick={(e) => { e.preventDefault(); onSkip() }}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: '8px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Skip to flashcards"
        >
          Skip to flashcards
        </a>
      </div>
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
  onSelectOption: (i: number) => void
  onFreeTextChange: (v: string) => void
  onCheckAnswer: () => void
  onTryAgain: () => void
}

function ChallengeInput({
  step,
  selectedOption,
  freeText,
  challengeState,
  onSelectOption,
  onFreeTextChange,
  onCheckAnswer,
  onTryAgain,
}: ChallengeInputProps) {
  const canCheck = step.challenge_input ? freeText.trim().length > 0 : selectedOption !== null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {step.challenge_input ? (
        <input
          type="text"
          value={freeText}
          onChange={(e) => onFreeTextChange(e.target.value)}
          placeholder="Type your answer…"
          aria-label="Challenge answer input"
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--bg-border)',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            outline: 'none',
            minHeight: '44px',
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(step.challenge_options ?? []).map((opt, i) => (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectOption(i)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${selectedOption === i ? 'var(--accent)' : 'var(--bg-border)'}`,
                backgroundColor: selectedOption === i ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: '44px',
              }}
            >
              <MarkdownText text={opt} />
            </motion.button>
          ))}
        </div>
      )}

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
          {step.challenge_explanation && (
            <ObsidianMarkdown text={step.challenge_explanation} className="obs-md--explanation" />
          )}
        </motion.div>
      )}

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
          disabled={!canCheck}
          style={{
            padding: '14px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: canCheck ? 'var(--accent)' : 'var(--bg-elevated)',
            color: canCheck ? '#000' : 'var(--text-muted)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            cursor: canCheck ? 'pointer' : 'not-allowed',
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
