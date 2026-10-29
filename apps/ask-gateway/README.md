# Ask Gateway

FastAPI service that provides SSE chat streaming for PrincetonCourses and calls Junction MCP tools.

## Direct Claude API and model tiers

The gateway calls `https://api.anthropic.com/v1/messages` directly using
`ANTHROPIC_API_KEY`. It does not use OpenRouter. Authenticated PrincetonCourses
users get Sonnet 5.5 (`claude-sonnet-5-5`) for the first $3, then Haiku 5.5
(`claude-haiku-5-5`) for the next $1 in the existing eight-hour quota window.
`ASK_LLM_MODEL` selects the default for requests without a netid. Only the two
priced tier models are accepted. Output is capped at 4,096 tokens per API call.

### Prompt caching

The Messages API is stateless: each request replays conversation history. There
is no provider session ID to create or keep alive. The application's conversation
ID is for history/correlation and is not added to the cached prompt.

- Keep tools and system instructions stable; tools are sorted by name.
- An explicit breakpoint at the end of the system prompt caches tools + system.
- Top-level automatic `cache_control` advances the cache through growing history,
  including tool calls and results. Both use the default five-minute TTL; hits
  refresh it. Different models have independent caches.
- Prefix matches, not session IDs, determine cache hits. The two tier models
  currently require at least 512 tokens for caching. Short prompts may not cache.
- Logs expose cache-read and cache-write token counts, without prompt contents.
  Quota cost estimates include uncached input, cache writes, cache reads, and output
  at the published model rates, including Haiku's >100K input tier.
- Completion `quota.model` identifies the model that handled the request;
  `quota.nextModel` identifies the model chosen after charging it.

References: [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching),
[streaming](https://platform.claude.com/docs/en/api/messages-streaming).
Models and pricing verified October 29, 2026. Update `MODEL_RATES` with any future
model changes; these estimates are not an Anthropic billing reconciliation.

### Production configuration

CD loads the credential from the SSM SecureString
`/ask-gateway/production/ANTHROPIC_API_KEY` in `us-east-1` using the instance role.
`scripts/configure_anthropic.py` atomically updates the existing `.env` with mode
0600, preserving gateway/MCP/Supabase credentials and removing OpenRouter settings.
It fails before restart if the key cannot be read. No API key belongs in GitHub
source or workflow logs. Local development uses `.env.example` and an `.env` file.

## Endpoints

- `GET /health` - health check
- `POST /ask/stream` - SSE chat stream

## Run locally

1. Create and activate a Python virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and set secrets.
4. Start:

```bash
uvicorn app.main:app --reload --port 8010
```

## Human-in-the-loop test (Commit 5)

1. Start Engine (`apps/engine`) and Ask Gateway.
2. Send `POST /ask/stream` with a user message and observe SSE events in order:
   - `status(starting)` -> `tool_call` -> `tool_result` -> `token` -> `done`
3. Trigger timeout by setting very low `ASK_TOOL_TIMEOUT_SECONDS` and verify `event:error` with `code=timeout`.
4. Disconnect the client mid-stream and verify a cancellation error event is emitted.

## Smoke test

```bash
ASK_GATEWAY_URL=http://localhost:8010 ./scripts/smoke_ask_ai.sh
```
