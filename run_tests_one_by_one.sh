#!/bin/bash
FILES=$(find tests src -name "*.test.ts" -o -name "*.test.tsx" | grep -v "node_modules")
TOTAL=$(echo "$FILES" | wc -l)
CURRENT=0
FAILED=()

echo "Running $TOTAL tests one by one..."

for FILE in $FILES; do
  CURRENT=$((CURRENT + 1))
  echo "[$CURRENT/$TOTAL] Running $FILE..."
  npx vitest run "$FILE" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "  ✅ PASSED"
  else
    echo "  ❌ FAILED"
    FAILED+=("$FILE")
  fi
done

echo "-----------------------------------"
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "All $TOTAL tests passed individually!"
else
  echo "${#FAILED[@]} tests failed:"
  for FILE in "${FAILED[@]}"; do
    echo "  - $FILE"
  done
  exit 1
fi
