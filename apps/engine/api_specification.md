# Engine API Specification

**Base URL:** `http://...`
**Framework:** Fastify 5 with OpenAPI/Swagger (`/docs` for Swagger UI, `/openapi.json` for raw spec)

---

## Data Sources

### PostgreSQL (primary data store)

Connected via `POSTGRES_URL` env var. Uses Drizzle ORM with the `node-postgres` driver.

| Table | PK | Description |
|---|---|---|
| `users` | `id` (serial) | Registered users with email, netid, year, admin flag, theme prefs |
| `feedback` | `id` (serial) | User-submitted feedback, FK → `users.id` |
| `schedules` | `id` (serial) | User schedules per term, FK → `users.id` |
| `custom_events` | `id` (serial) | User-created calendar events with JSON `times`, FK → `users.id` |
| `courses` | `id` (text, `{listing_id}-{term}`) | Course catalog entries per term |
| `sections` | `id` (serial) | Class sections (lectures, precepts, labs), FK → `courses.id` |
| `instructors` | `netid` (text) | Instructor profiles with optional rating data |
| `departments` | `code` (text) | Department codes (e.g. `COS`, `EGR`) |
| `evaluations` | `id` (serial) | Course evaluation data (comments, ratings), FK → `courses.id` |
| `schedule_course_map` | (`schedule_id`, `course_id`) | Many-to-many: schedules ↔ courses, with color/confirms metadata |
| `schedule_event_map` | (`schedule_id`, `custom_event_id`) | Many-to-many: schedules ↔ custom events |
| `course_department_map` | (`course_id`, `department_code`) | Many-to-many: courses ↔ departments |
| `course_instructor_map` | (`course_id`, `instructor_id`) | Many-to-many: courses ↔ instructors |
| `icals` | `id` (serial) | iCal export URLs, FK → `users.id`, `schedules.id` |
| `analytics` | `id` (serial) | Usage analytics events, FK → `users.id` |

### Redis (caching layer)

Connected via `REDIS_URL` env var. Uses `node-redis` wrapped in `RedisCache`.

- **Default TTL:** 6 hours
- **Cache pattern:** `getOrSetJson(key, loader)` — returns cached value or runs `loader`, stores result, and returns it.
- **Key patterns:**
  - `courses:all` — all courses with instructors
  - `courses:term:{term}` — courses for a specific term

Used by: `GET /api/courses/all`, `GET /api/courses/:term`. All other endpoints hit Postgres directly.

### External: TigerSnatch service (proxy)

The `/snatch/*` endpoints proxy requests to an external TigerSnatch service.

- **Env vars required:** `SNATCH_TOKEN` (auth header), `SNATCH_URL` (base URL)
- Requests are forwarded with the `Authorization: <SNATCH_TOKEN>` header.

---

## Endpoints

### Health

#### `GET /health/`

Basic health check.

| | |
|---|---|
| **Data source** | None |
| **Auth** | None |

**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-02-20T01:19:13.180Z" }
```

---

#### `GET /health/detailed`

Detailed health check with system metrics.

| | |
|---|---|
| **Data source** | None (reads `process.memoryUsage()` and `os` module) |
| **Auth** | None |

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 1048,
  "memory": { "heapUsedMB": 29, "heapTotalMB": 30, "rssMB": 60, "systemFreeMB": 206, "systemTotalMB": 36864 },
  "environment": "development",
  "nodeVersion": "v24.3.0",
  "platform": "darwin arm64"
}
```

---

### Courses

#### `GET /api/courses/all`

Get all courses across all terms with instructor information.

| | |
|---|---|
| **Data source** | Redis (`courses:all`) → PostgreSQL (`courses` LEFT JOIN `course_instructor_map` LEFT JOIN `instructors`) |
| **Auth** | None (TODO) |

**Response 200:**
```json
{
  "success": true,
  "count": 0,
  "data": [
    {
      "id": "002071-1262",
      "listingId": "002071",
      "term": 1262,
      "code": "COS 126",
      "title": "Computer Science: An Interdisciplinary Approach",
      "description": "...",
      "status": "open",
      "dists": ["QCR"],
      "gradingBasis": "GRD",
      "hasFinal": true,
      "instructors": [
        { "netid": "abc123", "name": "John Doe", "email": "jdoe@princeton.edu" }
      ]
    }
  ]
}
```

---

#### `GET /api/courses/:term`

Get all courses for a specific term with instructor information.

| | |
|---|---|
| **Data source** | Redis (`courses:term:{term}`) → PostgreSQL (`courses` LEFT JOIN `course_instructor_map` LEFT JOIN `instructors`, filtered by `courses.term`) |
| **Auth** | None (TODO) |
| **Params** | `term` (number, path) — term code, e.g. `1262` |

**Response 200:** Same shape as `/api/courses/all`.

**Response 400:** `{ "success": false, "error": "Invalid term parameter" }`

---

#### `GET /api/courses/:courseId/sections`

Get all sections for a specific course.

| | |
|---|---|
| **Data source** | PostgreSQL (`sections` WHERE `course_id = :courseId`) |
| **Auth** | None (TODO) |
| **Params** | `courseId` (string, path) — e.g. `"002071-1262"` |

**Response 200:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "courseId": "002071-1262",
      "title": "Lecture",
      "num": "L01",
      "room": "CS 104",
      "tot": 150,
      "cap": 200,
      "days": 10,
      "startTime": 660,
      "endTime": 710,
      "status": "open"
    }
  ]
}
```

---

### Sections

#### `GET /api/sections/:term`

Get all sections for a specific term.

| | |
|---|---|
| **Data source** | PostgreSQL (`sections` INNER JOIN `courses` ON `sections.course_id = courses.id`, filtered by `courses.term`) |
| **Auth** | None (TODO) |
| **Params** | `term` (number, path) — term code |

**Response 200:** Same shape as course sections, but across all courses in the term.

**Response 400:** `{ "success": false, "error": "Invalid term parameter" }`

---

### Instructors

#### `GET /api/instructors/`

Get all instructors, ordered by name.

| | |
|---|---|
| **Data source** | PostgreSQL (`instructors`) |
| **Auth** | None (TODO) |

**Response 200:**
```json
{
  "success": true,
  "count": 0,
  "data": [
    {
      "netid": "abc123",
      "emplid": "000123456",
      "name": "Doe, J.",
      "fullName": "John Doe",
      "department": "COS",
      "email": "jdoe@princeton.edu",
      "office": "CS 210",
      "rating": 4.5,
      "ratingUncertainty": 0.3,
      "numRatings": 42
    }
  ]
}
```

---

#### `GET /api/instructors/:netid`

Get a specific instructor by netid.

| | |
|---|---|
| **Data source** | PostgreSQL (`instructors` WHERE `netid = :netid`) |
| **Auth** | None (TODO) |
| **Params** | `netid` (string, path) |

**Response 200:** `{ "success": true, "data": { ...instructor } }`

**Response 404:** `{ "success": false, "error": "Instructor not found" }`

---

### Users

#### `GET /api/users/:userId/schedules`

Get all schedules for a user, optionally filtered by term.

| | |
|---|---|
| **Data source** | PostgreSQL (`schedules` WHERE `user_id = :userId` [AND `term = :term`]) |
| **Auth** | None (TODO) |
| **Params** | `userId` (number, path) |
| **Query** | `term` (number, optional) — filter by term |

**Response 200:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    { "id": 1, "relativeId": 0, "userId": 1, "title": "My Schedule", "isPublic": false, "term": 1262 }
  ]
}
```

---

#### `GET /api/users/:userId/events`

Get all custom events for a user.

| | |
|---|---|
| **Data source** | PostgreSQL (`custom_events` WHERE `user_id = :userId`) |
| **Auth** | None (TODO) |
| **Params** | `userId` (number, path) |

**Response 200:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    { "id": 1, "userId": 1, "title": "Study Group", "times": { "monday": { "start": "14:00", "end": "16:00" } } }
  ]
}
```

> **Known bug:** The `times` field is returned as `{}` due to Fastify's response serializer stripping properties from `type: "object"` without `additionalProperties: true`.

---

### Schedules

#### `POST /api/schedules/`

Create a new schedule.

| | |
|---|---|
| **Data source** | PostgreSQL INSERT → `schedules` |
| **Auth** | None (TODO) |

**Request body:**
```json
{
  "userId": 1,
  "term": 1262,
  "title": "My Schedule",
  "relativeId": 0,
  "isPublic": false
}
```

| Field | Type | Required | Default |
|---|---|---|---|
| `userId` | number | yes | — |
| `term` | number | yes | — |
| `title` | string | yes | — |
| `relativeId` | number | yes | — |
| `isPublic` | boolean | no | `false` |

**Response 201:** `{ "success": true, "data": { ...schedule } }`

---

#### `GET /api/schedules/:scheduleId`

Get a specific schedule by ID.

| | |
|---|---|
| **Data source** | PostgreSQL (`schedules` WHERE `id = :scheduleId`) |
| **Auth** | None (TODO) |
| **Params** | `scheduleId` (number, path) |

**Response 200:** `{ "success": true, "data": { ...schedule } }`

**Response 404:** `{ "success": false, "error": "Schedule not found" }`

---

#### `PATCH /api/schedules/:scheduleId`

Update a schedule's title.

| | |
|---|---|
| **Data source** | PostgreSQL UPDATE → `schedules` WHERE `id = :scheduleId` |
| **Auth** | None (TODO) |
| **Params** | `scheduleId` (number, path) |

**Request body:**
```json
{ "title": "New Title" }
```

**Response 200:** `{ "success": true, "data": { "id": 1, "title": "New Title" } }`

**Response 404:** `{ "success": false, "error": "Schedule not found" }`

---

#### `DELETE /api/schedules/:scheduleId`

Delete a schedule. Cascading deletes remove associated course/event mappings.

| | |
|---|---|
| **Data source** | PostgreSQL DELETE → `schedules` WHERE `id = :scheduleId` |
| **Auth** | None (TODO) |
| **Params** | `scheduleId` (number, path) |

**Response 200:** `{ "success": true, "message": "Schedule deleted successfully" }`

**Response 404:** `{ "success": false, "error": "Schedule not found" }`

---

#### `GET /api/schedules/:scheduleId/courses`

Get all course associations for a schedule.

| | |
|---|---|
| **Data source** | PostgreSQL (`schedule_course_map` WHERE `schedule_id = :scheduleId`) |
| **Auth** | None (TODO) |

**Response 200:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    { "scheduleId": 1, "courseId": "002071-1262", "color": 3, "isComplete": false, "confirms": {} }
  ]
}
```

---

#### `POST /api/schedules/:scheduleId/courses`

Add a course to a schedule.

| | |
|---|---|
| **Data source** | PostgreSQL INSERT → `schedule_course_map` |
| **Auth** | None (TODO) |

**Request body:**

| Field | Type | Required | Default |
|---|---|---|---|
| `courseId` | string | yes | — |
| `color` | number | no | `0` |
| `isComplete` | boolean | no | `false` |
| `confirms` | object | no | `{}` |

**Response 201:** `{ "success": true, "data": { ...association } }`

---

#### `POST /api/schedules/:scheduleId/courses/bulk`

Bulk add multiple courses to a schedule.

| | |
|---|---|
| **Data source** | PostgreSQL bulk INSERT → `schedule_course_map` |
| **Auth** | None (TODO) |

**Request body:**
```json
{
  "courses": [
    { "courseId": "002071-1262", "color": 1 },
    { "courseId": "002072-1262", "color": 2 }
  ]
}
```

**Response 201:** `{ "success": true, "count": 2, "data": [ ...associations ] }`

---

#### `PATCH /api/schedules/:scheduleId/courses/:courseId`

Update course metadata (color, section selections) in a schedule.

| | |
|---|---|
| **Data source** | PostgreSQL UPDATE → `schedule_course_map` WHERE (`schedule_id`, `course_id`) |
| **Auth** | None (TODO) |

**Request body (all optional):**

| Field | Type |
|---|---|
| `color` | number |
| `isComplete` | boolean |
| `confirms` | object (section selection map) |

**Response 200:** `{ "success": true, "data": { ...association } }`

**Response 404:** `{ "success": false, "error": "Course association not found" }`

---

#### `DELETE /api/schedules/:scheduleId/courses/:courseId`

Remove a single course from a schedule.

| | |
|---|---|
| **Data source** | PostgreSQL DELETE → `schedule_course_map` WHERE (`schedule_id`, `course_id`) |
| **Auth** | None (TODO) |

**Response 200:** `{ "success": true, "message": "Course removed from schedule" }`

**Response 404:** `{ "success": false, "error": "Course association not found" }`

---

#### `DELETE /api/schedules/:scheduleId/courses`

Clear all courses from a schedule.

| | |
|---|---|
| **Data source** | PostgreSQL DELETE → `schedule_course_map` WHERE `schedule_id = :scheduleId` |
| **Auth** | None (TODO) |

**Response 200:** `{ "success": true, "message": "All courses cleared from schedule", "count": 3 }`

---

#### `GET /api/schedules/:scheduleId/events`

Get all event associations for a schedule.

| | |
|---|---|
| **Data source** | PostgreSQL (`schedule_event_map` WHERE `schedule_id = :scheduleId`) |
| **Auth** | None (TODO) |

**Response 200:**
```json
{ "success": true, "count": 1, "data": [{ "scheduleId": 1, "customEventId": 5 }] }
```

---

#### `POST /api/schedules/:scheduleId/events`

Add an event to a schedule.

| | |
|---|---|
| **Data source** | PostgreSQL INSERT → `schedule_event_map` |
| **Auth** | None (TODO) |

**Request body:**
```json
{ "eventId": 5 }
```

**Response 201:** `{ "success": true, "data": { "scheduleId": 1, "customEventId": 5 } }`

---

#### `DELETE /api/schedules/:scheduleId/events/:eventId`

Remove an event from a schedule.

| | |
|---|---|
| **Data source** | PostgreSQL DELETE → `schedule_event_map` WHERE (`schedule_id`, `custom_event_id`) |
| **Auth** | None (TODO) |

**Response 200:** `{ "success": true, "message": "Event removed from schedule" }`

**Response 404:** `{ "success": false, "error": "Event association not found" }`

---

#### `DELETE /api/schedules/:scheduleId/events`

Clear all events from a schedule.

| | |
|---|---|
| **Data source** | PostgreSQL DELETE → `schedule_event_map` WHERE `schedule_id = :scheduleId` |
| **Auth** | None (TODO) |

**Response 200:** `{ "success": true, "message": "All events cleared from schedule", "count": 2 }`

---

### Events

#### `POST /api/events/`

Create a new custom event.

| | |
|---|---|
| **Data source** | PostgreSQL INSERT → `custom_events` |
| **Auth** | None (TODO) |

**Request body:**

| Field | Type | Required |
|---|---|---|
| `userId` | number | yes |
| `title` | string | yes |
| `times` | object (JSON) | yes |

**Response 201:** `{ "success": true, "data": { "id": 1, "userId": 1, "title": "...", "times": {...} } }`

> **Known bug:** `times` is returned as `{}` in responses (serialization issue, data is stored correctly in DB).

---

#### `PATCH /api/events/:eventId`

Update a custom event's title or times.

| | |
|---|---|
| **Data source** | PostgreSQL UPDATE → `custom_events` WHERE `id = :eventId` |
| **Auth** | None (TODO) |
| **Params** | `eventId` (number, path) |

**Request body (all optional):**

| Field | Type |
|---|---|
| `title` | string |
| `times` | object (JSON) |

**Response 200:** `{ "success": true, "data": { ...event } }`

**Response 404:** `{ "success": false, "error": "Event not found" }`

---

#### `DELETE /api/events/:eventId`

Delete a custom event. Cascading deletes remove `schedule_event_map` entries.

| | |
|---|---|
| **Data source** | PostgreSQL DELETE → `custom_events` WHERE `id = :eventId` |
| **Auth** | None (TODO) |
| **Params** | `eventId` (number, path) |

**Response 200:** `{ "success": true, "message": "Event deleted successfully" }`

**Response 404:** `{ "success": false, "error": "Event not found" }`

---

#### `GET /api/events/:eventId/schedules`

Get all schedule associations for an event.

| | |
|---|---|
| **Data source** | PostgreSQL (`schedule_event_map` WHERE `custom_event_id = :eventId`) |
| **Auth** | None (TODO) |
| **Params** | `eventId` (number, path) |

**Response 200:**
```json
{ "success": true, "count": 2, "data": [{ "scheduleId": 1, "customEventId": 5 }] }
```

---

### Feedback

#### `POST /api/feedback/`

Submit user feedback.

| | |
|---|---|
| **Data source** | PostgreSQL INSERT → `feedback` |
| **Auth** | None (TODO) |

**Request body:**

| Field | Type | Required |
|---|---|---|
| `userId` | number | yes |
| `feedback` | string | yes |

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "feedback": "Great app!",
    "isResolved": false,
    "createdAt": "2026-02-20T01:20:37.503Z"
  }
}
```

---

### Snatch (TigerSnatch proxy)

All snatch endpoints proxy to the external TigerSnatch service. They require `SNATCH_TOKEN` and `SNATCH_URL` environment variables.

#### `POST /snatch/add_to_waitlist/:netid/:classid`

Add a user to a class waitlist.

| | |
|---|---|
| **Data source** | External HTTP → `{SNATCH_URL}/junction/add_to_waitlist/{netid}/{classid}` |
| **Auth** | Proxied via `Authorization: <SNATCH_TOKEN>` header |
| **Params** | `netid` (string), `classid` (string) |

**Response 200:** `{ "netid": "ab1234", "classid": "12345", "success": true, "message": "Successfully added to waitlist" }`

**Response 500:** `{ ..., "success": false, "message": "Environmental variable error" }` (if env vars missing)

---

#### `POST /snatch/remove_from_waitlist/:netid/:classid`

Remove a user from a class waitlist.

| | |
|---|---|
| **Data source** | External HTTP → `{SNATCH_URL}/junction/remove_from_waitlist/{netid}/{classid}` |
| **Auth** | Proxied via `Authorization: <SNATCH_TOKEN>` header |
| **Params** | `netid` (string), `classid` (string) |

**Response 200:** `{ "netid": "ab1234", "classid": "12345", "success": true, "message": "Successfully removed from waitlist" }`

---

#### `GET /snatch/get_user_data/:netid`

Get a user's waitlist data.

| | |
|---|---|
| **Data source** | External HTTP → `{SNATCH_URL}/junction/get_user_data/{netid}` (note: uses POST method upstream despite being a GET route) |
| **Auth** | Proxied via `Authorization: <SNATCH_TOKEN>` header |
| **Params** | `netid` (string) |

**Response 200:** `{ "netid": "ab1234", "success": true, "message": "Successfully got user data" }`

---

## Known Issues

1. **`times` field serialization bug** — In `POST /api/events/`, `PATCH /api/events/:eventId`, and `GET /api/users/:userId/events`, the `times` JSONB field is stored correctly in PostgreSQL but returned as `{}` in API responses. This is because the Fastify response schema declares `times` as `type: "object"` without `additionalProperties: true`, causing the serializer to strip all nested properties.

2. **Snatch endpoints require external service** — All `/snatch/*` endpoints return 500 unless `SNATCH_TOKEN` and `SNATCH_URL` env vars are configured and the external TigerSnatch service is reachable.

3. **No authentication** — All endpoints are currently unauthenticated (marked with `// TODO: Add authentication/authorization check` in source).

---

## Error Response Format

All endpoints use a consistent error envelope:

```json
{ "success": false, "error": "Human-readable error message" }
```

Standard HTTP status codes: `400` (bad request/validation), `404` (not found), `500` (server error).
