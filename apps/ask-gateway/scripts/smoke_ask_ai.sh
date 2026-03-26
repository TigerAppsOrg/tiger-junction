#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${ASK_GATEWAY_URL:-http://localhost:8010}"
GATEWAY_TOKEN="${ASK_GATEWAY_TOKEN:-}"

echo "Running Ask AI smoke test against ${GATEWAY_URL}"

AUTH_HEADER=()
if [[ -n "${GATEWAY_TOKEN}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${GATEWAY_TOKEN}")
fi

curl -N \
  -X POST "${GATEWAY_URL}/ask/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  "${AUTH_HEADER[@]}" \
  --data '{"messages":[{"role":"user","content":"list departments"}]}' \
  | rg "event: (status|tool_call|tool_result|token|done|error)" -n

echo
echo "Smoke test completed. Confirm stream includes done or expected error."
