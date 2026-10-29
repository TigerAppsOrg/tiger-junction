# Ask Gateway

FastAPI service that provides SSE chat streaming for PrincetonCourses and calls Junction MCP tools.

## Model tiers

Authenticated users (including PrincetonCourses users) use Claude Sonnet 5.5
(`anthropic/claude-sonnet-5.5`) for the first $3 of each quota window, then Claude
Haiku 5.5 (`anthropic/claude-haiku-5.5`) for the remaining $1. Requests are blocked
at $4 until the existing eight-hour quota window resets. Model IDs are defined
in `app/usage_tracker.py`; they were verified against OpenRouter's model catalog
on October 29, 2026. Quota responses include the model ID for client display.
Agentic completion metadata reports the model that handled the request in
`quota.model`, and the model selected by the updated quota in `quota.nextModel`.
This keeps a response attributed to Sonnet even if its cost moves the user into
the Haiku tier for their next request.

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
