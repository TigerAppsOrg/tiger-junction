# Ask Gateway LLM Rollout

This document defines the safe rollout sequence for Milestone 2 planner/synthesizer behavior.

## Backend

- LLM backend uses Anthropic's direct Messages API with `ANTHROPIC_API_KEY`.
- Default/tier 1 model: `claude-sonnet-5-5`.
- Tier 2/test model: `claude-haiku-5-5`.
- Prompt caching and production SSM setup are documented in [the gateway README](../README.md).

## Flags

- `ASK_LLM_PLANNER_ENABLED`
- `ASK_LLM_SYNTHESIS_ENABLED`

Both default to `false` in `.env.example` to preserve deterministic Milestone 1 behavior.

## Rollout Stages

1. **Stage 1 (baseline):** planner OFF, synthesis OFF.
2. **Stage 2 (routing validation):** planner ON, synthesis OFF.
3. **Stage 3 (full Milestone 2):** planner ON, synthesis ON.

## Rollback

Set both flags to `false`. No code revert is required.

## Monitoring Checklist

- Verify SSE event contract remains unchanged.
- Track planner fallback frequency (invalid planner payloads).
- Track synthesis fallback frequency (LLM failures).
- Confirm user-visible responses keep `Direct answer`, `Top picks`, and `Why` sections.
