# Ask AI Runbook

Operational guide for Ask AI (PrincetonCourses -> Ask Gateway -> Junction MCP).

## Required Environment Variables

### Engine (`apps/engine`)

- `MCP_ACCESS_TOKEN`
- `MCP_SESSION_TTL_MS`
- `MCP_MAX_SESSIONS_PER_CLIENT`
- `POSTGRES_URL`
- `REDIS_URL`

### Ask Gateway (`apps/ask-gateway`)

- `ASK_GATEWAY_API_TOKEN`
- `JUNCTION_MCP_URL`
- `JUNCTION_MCP_TOKEN`
- `MCP_PROTOCOL_VERSION`
- `ASK_TOOL_TIMEOUT_SECONDS`
- `ASK_CONNECT_TIMEOUT_SECONDS`

### Web (`apps/web`)

- `ASK_GATEWAY_URL`
- `ASK_GATEWAY_TOKEN`

## Logging and Observability

- Gateway emits lifecycle logs with `request_id`:
  - `ask_stream.start`
  - `ask_stream.client_disconnected`
  - `ask_stream.finish`
- Gateway SSE payloads include:
  - `requestId`
  - `sessionId` (after MCP initialize)
- Engine MCP responds with structured JSON-RPC error envelopes on auth/session failures.

## Smoke Test

Run after deploy or config updates:

```bash
cd apps/ask-gateway
ASK_GATEWAY_URL=http://localhost:8010 ./scripts/smoke_ask_ai.sh
```

Expected:

- `event: status`
- `event: tool_call`
- `event: tool_result`
- `event: token`
- `event: done`

## Failure Modes and Mitigations

- `Unauthorized gateway request`
  - Check `ASK_GATEWAY_TOKEN` in web and `ASK_GATEWAY_API_TOKEN` in gateway.
- `Unauthorized: missing or invalid bearer token` from engine MCP
  - Check `JUNCTION_MCP_TOKEN` in gateway and `MCP_ACCESS_TOKEN` in engine.
- `No identity mapping found for external user`
  - Insert mapping into `external_user_identities` for user onboarding.
- Frequent `timeout`
  - Increase `ASK_TOOL_TIMEOUT_SECONDS`, inspect engine latency and DB health.
- Excess `Too many active MCP sessions`
  - Validate client disconnect handling and tune `MCP_MAX_SESSIONS_PER_CLIENT`.

## Rollback Strategy

1. Disable Ask AI UI by removing or feature-flagging Ask AI entry in web header.
2. Keep `/mcp` hardening changes enabled (security fixes should remain).
3. Stop Ask Gateway deployment if it causes instability.
4. Re-point web `ASK_GATEWAY_URL` to last known good gateway release.

## Human-in-the-loop Staging Checklist

1. Auth:
   - Unauthenticated user cannot access Ask AI.
   - Authenticated user can open Ask AI.
2. Streaming:
   - Prompt returns status/tool/token/done event sequence.
   - Client cancel produces cancellation behavior and no leaked sessions.
3. Tooling:
   - Prompt for departments, instructors, and rating flows through MCP tools.
   - Malformed IDs return deterministic structured errors.
4. Ownership:
   - User A cannot access User B schedule tools.
   - Unmapped user receives onboarding mapping error.
5. Reliability:
   - Smoke test passes.
   - Logs contain `request_id` and event lifecycle for at least 5 parallel sessions.
