#!/bin/zsh

set -euo pipefail

PROJECT_DIR=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_DIR")

LOG_DIR="$PROJECT_DIR/.claude-overnight"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/run_$(date +%Y%m%d_%H%M%S).log"

MAX_RETRIES=4
MAX_ITERATIONS=100

echo "🚀 Claude overnight automation started"
echo "Project: $PROJECT_NAME"
echo "Path: $PROJECT_DIR"

# Safety checks
if [ ! -f "TASKS.md" ]; then
  echo "❌ TASKS.md not found"
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo "❌ package.json not found"
  exit 1
fi

# Safety branch
git checkout -b "claude-night-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

run_claude() {
  local PROMPT="$1"

  claude -p \
    --permission-mode bypassPermissions \
    --add-dir "$PROJECT_DIR" \
    --allowedTools \
    "Read Edit MultiEdit Write Bash(git *) Bash(npm *) Bash(npx *) Bash(node *) Bash(cat *) Bash(ls *) Bash(find *) Bash(grep *) Bash(mkdir *) Bash(cp *) Bash(mv *) Bash(pwd)" \
    --disallowedTools \
    "Bash(rm -rf /) Bash(sudo *) Bash(chmod /) Bash(chown *) Bash(curl *) Bash(wget *) Bash(brew *) Bash(open *)" \
    --model sonnet \
    --effort high \
    "$PROMPT"
}

for ((i=1; i<=MAX_ITERATIONS; i++))
do
  echo ""
  echo "==============================" | tee -a "$LOG_FILE"
  echo "Iteration $i" | tee -a "$LOG_FILE"
  echo "==============================" | tee -a "$LOG_FILE"

  PROMPT=$(cat <<EOF
You are a senior React + TypeScript architect.

PROJECT ROOT:
$PROJECT_DIR

STRICT FILESYSTEM RULES:
- NEVER modify files outside project root.
- NEVER touch files outside:
  $PROJECT_DIR
- NEVER run commands outside this project.
- NEVER delete files unless necessary.
- NEVER use rm outside project root.
- NEVER edit system files.
- NEVER touch ~/.claude, ~/.zshrc, ~/.npm, ~/.config.

TASK EXECUTION:
1. Read TASKS.md
2. Continue ONLY from the FIRST unchecked task
3. Follow BDD workflow exactly
4. Respect CLAUDE.md
5. Respect docs/*
6. Respect existing architecture

QUALITY:
- Production-quality code
- SOLID
- DRY
- KISS
- Type-safe
- Accessibility-first

WORKFLOW:
1. Implement next logical task(s)
2. Run tests
3. Fix failures
4. Update TASKS.md
5. Write docs/SESSION_SUMMARY.md

DO NOT:
- Skip phases
- Refactor unrelated code
- Change architecture unnecessarily
- Ask for permission
- Pause for confirmation

Stop cleanly after finishing the current logical unit.
EOF
)

  echo "🤖 Running Claude..." | tee -a "$LOG_FILE"

  run_claude "$PROMPT" | tee -a "$LOG_FILE"

  echo "🧪 Running validation..." | tee -a "$LOG_FILE"

  TEST_SUCCESS=true

  npm run test || TEST_SUCCESS=false
  npm run test:bdd || TEST_SUCCESS=false
  npm run lint || TEST_SUCCESS=false
  npm run test:all || TEST_SUCCESS=false

  if [ "$TEST_SUCCESS" = false ]; then

    SUCCESS=false

    for ((retry=1; retry<=MAX_RETRIES; retry++))
    do
      echo "🔁 Retry $retry/$MAX_RETRIES" | tee -a "$LOG_FILE"

      run_claude "
Fix all failing tests.

Requirements:
- ONLY modify files inside:
$PROJECT_DIR

Run:
npm run test
npm run test:bdd
npm run lint
npm run test:all

Fix failures without breaking architecture.
" | tee -a "$LOG_FILE"

      FIXED=true

      npm run test || FIXED=false
      npm run test:bdd || FIXED=false
      npm run lint || FIXED=false
      npm run test:all || FIXED=false

      if [ "$FIXED" = true ]; then
        SUCCESS=true
        break
      fi
    done

    if [ "$SUCCESS" = false ]; then
      echo "🛑 Stopping after repeated failures" | tee -a "$LOG_FILE"
      exit 1
    fi
  fi

  echo "💾 Commiting progress..." | tee -a "$LOG_FILE"

  git add .

  git commit -m "claude progress $(date '+%Y-%m-%d %H:%M:%S')" || true

  sleep 5
done

echo "✅ Overnight automation completed"