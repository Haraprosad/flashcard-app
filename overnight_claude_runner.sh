#!/bin/zsh

set -euo pipefail

PROJECT_DIR=$(pwd)
LOG_DIR="$PROJECT_DIR/.claude-run"
mkdir -p "$LOG_DIR"

MAX_RETRIES=3

echo "START"

git checkout -b "auto-run-$(date +%s)" 2>/dev/null || true

run_claude() {
  local PROMPT="$1"

  claude -p \
    --permission-mode bypassPermissions \
    --add-dir "$PROJECT_DIR" \
    --model sonnet \
    --effort high \
    "$PROMPT"
}

get_next_task() {
  grep -n "\- \[ \]" "$PROJECT_DIR/docs/TASKS.md" | head -n 1 | cut -d: -f1
}

while true
do
  TASK_LINE=$(get_next_task)

  if [ -z "$TASK_LINE" ]; then
    echo "DONE"
    exit 0
  fi

  TASK=$(sed -n "${TASK_LINE}p" "$PROJECT_DIR/docs/TASKS.md")

  PROMPT=$(cat <<EOF
RULES:
- short output only (3-6 words max lines)
- no explanation
- no filler
- action first
- tool first

PROJECT:
$PROJECT_DIR

TASK:
$TASK

DO:
1. implement only this task
2. run tests
3. fix errors
4. update TASKS.md
5. stop

OUTPUT STYLE:
DONE / FAIL / FIXED ONLY
EOF
)

  echo "RUN TASK: $TASK_LINE"

  SUCCESS=false

  for ((i=1; i<=MAX_RETRIES; i++))
  do
    run_claude "$PROMPT"

    npm run test && npm run lint && npm run test:all && SUCCESS=true && break

    run_claude "FIX ONLY. NO TEXT. ONLY PATCH." || true
  done

  git add .
  git commit -m "auto $(date +%s)" || true

  sleep 2
done