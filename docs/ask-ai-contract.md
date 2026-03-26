# Ask AI Contract

This document defines the cross-service contract for Ask AI across PrincetonCourses, the Ask gateway, and Junction Engine MCP.

## Goals

- Deterministic tool calls and identifiers.
- Safe access to user-specific schedule data.
- Stream-first UX via Server-Sent Events (SSE).

## Components

- `PrincetonCourses` (web client): sends prompt + context, renders stream.
- `Ask Gateway` (FastAPI): orchestrates model streaming and MCP tool calls.
- `Junction Engine MCP` (`/mcp`): executes read-only tools against engine data.

## Transport Contracts

### Browser -> Ask Gateway

- Method: `POST /ask/stream`
- Content type: `application/json`
- Response content type: `text/event-stream`
- Required auth: PrincetonCourses authenticated session (gateway verifies caller identity).

Request body:

```json
{
  "conversationId": "optional-string",
  "term": 1264,
  "messages": [
    { "role": "user", "content": "Find me top LA courses with no final." }
  ]
}
```

### Ask Gateway -> Junction MCP

- Endpoint: `POST /mcp`
- Content type: `application/json`
- Accept: `application/json, text/event-stream`
- Required headers:
  - `Authorization: Bearer <gateway-engine-token-or-jwt>`
  - `mcp-session-id` on follow-up calls after `initialize`
  - `mcp-protocol-version` when required by client implementation

## SSE Event Schema (Gateway -> Browser)

Each frame uses:

- `event: <name>`
- `data: <json-string>`

Event names and payload shape:

- `status`
  - `{ "phase": "starting" | "calling_tool" | "streaming" | "done" }`
- `token`
  - `{ "text": "partial model token text" }`
- `tool_call`
  - `{ "name": "search_courses", "arguments": { "...": "..." } }`
- `tool_result`
  - `{ "name": "search_courses", "ok": true, "result": { "...": "..." } }`
- `error`
  - `{ "code": "upstream_error|auth_error|timeout|validation_error", "message": "human-readable" }`
- `done`
  - `{ "conversationId": "string", "usage": { "inputTokens": 0, "outputTokens": 0 } }`

## Identifier Contract

### Course IDs

- `courseId`: canonical engine course identifier, format `<listingId>-<term>`, e.g. `002051-1264`.
- `listingId`: stable listing identifier across terms, e.g. `002051`.
- `code`: human-readable code, e.g. `COS 226`.

Rules:

1. Tools that require a specific course offering prefer `courseId`.
2. Tools that aggregate across terms may use `listingId`.
3. If user provides only `code`, tool resolution must either:
   - use provided `term`, or
   - use latest available term deterministically, or
   - return disambiguation options (never arbitrary selection).

### User/Schedule IDs

- `engineUserId`: integer `users.id` from engine DB.
- `externalUserId`: PrincetonCourses/Supabase user id (string UUID).
- `scheduleId`: integer engine schedule id.

Rules:

1. User-facing tools must authorize ownership via mapped identity (`externalUserId -> engineUserId`).
2. Never trust client-provided `userId`/`scheduleId` without ownership verification.

## Term Disambiguation

- Supported term code format: integer (e.g. `1264`).
- Default policy: if term omitted, use most recent term available for that course.
- If lookup is ambiguous after applying default policy, return explicit options with course code + term.

## Safety Guardrails

- MCP tools are read-only in Ask AI flow.
- Schedule and user tools require authenticated context and ownership checks.
- Responses should avoid leaking internal identifiers unless needed for follow-up tool calls.
- Return structured tool errors (`isError: true`) for invalid IDs, missing ownership, and ambiguous lookups.

## Human-in-the-loop verification checklist (Commit 1)

1. Review five prompt examples and map each to tool calls:
   - Compare two courses.
   - Find top LA courses.
   - Find courses that fit schedule.
   - Instructor lookup.
   - Summarize reviews.
2. Verify each call uses deterministic IDs (`courseId`/`listingId`/`scheduleId`) per this contract.
3. Verify ambiguity path is defined (ask follow-up or return options, not arbitrary picks).
