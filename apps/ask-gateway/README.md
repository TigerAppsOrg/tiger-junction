# Ask Gateway

FastAPI service that provides SSE chat streaming for PrincetonCourses and calls Junction MCP tools.

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
