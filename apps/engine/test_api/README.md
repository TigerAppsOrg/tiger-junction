# API Tests

This directory contains comprehensive integration tests for all Tiger Junction Engine API endpoints.

## Test Results

✅ **54 passing tests** across 8 test suites

## Running Tests

### Recommended: Use the test runner script
```bash
./test_api/run_tests.sh
```

This script automatically:
1. Starts the API server in the background
2. Waits for server to be ready
3. Runs all tests
4. Stops the server
5. Reports results

### Alternative: Run tests manually
```bash
# Terminal 1: Start the server
bun start

# Terminal 2: Run tests
bun test test_api/
```

### Run a specific test file:
```bash
bun test test_api/users.test.ts
bun test test_api/health.test.ts
bun test test_api/courses.test.ts
```

### Run tests in watch mode:
```bash
bun test --watch test_api/
```

## Test Structure

- **`health.test.ts`** (6 tests) - Health check endpoints
  - Basic health check (`GET /health`)
  - Detailed health check with system metrics (`GET /health/detailed`)

- **`users.test.ts`** (10 tests) - User management endpoints
  - User registration (`POST /api/users/register`)
  - Get user schedules (`GET /api/users/:userId/schedules`)
  - Get user events (`GET /api/users/:userId/events`)

- **`courses.test.ts`** (4 tests) - Course data endpoints
  - Get all courses (`GET /api/courses/all`)
  - Get courses by term (`GET /api/courses/:term`)

- **`sections.test.ts`** (7 tests) - Course section endpoints
  - Get sections by term (`GET /api/sections/:term`)
  - Validate enrollment numbers, time ranges, and status

- **`instructors.test.ts`** (7 tests) - Instructor endpoints
  - Get all instructors (`GET /api/instructors`)
  - Get specific instructor (`GET /api/instructors/:netid`)
  - Data integrity validation

- **`feedback.test.ts`** (5 tests) - Feedback endpoints
  - Submit feedback (`POST /api/feedback`)
  - Input validation

- **`events.test.ts`** (7 tests) - Custom event endpoints
  - Create events (`POST /api/events`)
  - Update events (`PATCH /api/events/:eventId`)
  - Delete events (`DELETE /api/events/:eventId`)
  - Get event schedules (`GET /api/events/:eventId/schedules`)

- **`schedules.test.ts`** (8 tests) - Schedule management endpoints
  - Create, read, update, delete schedules
  - Uses Fastify injection for faster testing

## Test Coverage Summary

### User API ✅
- ✅ Successfully register new users
- ✅ Validate email format
- ✅ Handle missing required fields
- ✅ Prevent duplicate netid registration
- ✅ Support various graduation years
- ✅ Get user schedules (with term filtering)
- ✅ Get user events

### Courses API ✅
- ✅ Get all courses with instructors
- ✅ Filter courses by term
- ✅ Handle invalid term parameters
- ✅ Return empty array for non-existent terms

### Sections API ✅
- ✅ Get sections by term
- ✅ Validate enrollment capacity
- ✅ Validate time ranges
- ✅ Validate days bitmask
- ✅ Validate status values

### Instructors API ✅
- ✅ Get all instructors
- ✅ Alphabetical ordering
- ✅ Get specific instructor
- ✅ Handle non-existent instructors
- ✅ Validate rating values
- ✅ Validate email formats

### Feedback API ✅
- ✅ Submit feedback successfully
- ✅ Require userId
- ✅ Require feedback text
- ✅ Handle empty strings
- ✅ Handle long feedback text

### Events API ✅
- ✅ Create custom events
- ✅ Require all fields
- ✅ Update events
- ✅ Delete events
- ✅ Get event schedules
- ✅ Handle non-existent events

### Schedules API ✅
- ✅ Create schedules
- ✅ Get schedules
- ✅ Update schedule titles
- ✅ Delete schedules
- ✅ Handle non-existent schedules
- ✅ Validate required fields

### Health API ✅
- ✅ Basic status check
- ✅ Detailed system metrics
- ✅ Memory usage validation
- ✅ Platform information

## Writing New Tests

When adding new API endpoints, follow this pattern:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import Fastify, { FastifyInstance } from "fastify";
import fastifySensible from "@fastify/sensible";
import yourRoutes from "../src/routes/api/your-routes.js";

describe("Your API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(fastifySensible);
    await app.register(yourRoutes, { prefix: "/api/your-prefix" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/your-endpoint", () => {
    it("should do something", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/your-endpoint"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });
});
```

## Database Testing

These tests interact with the actual database. Make sure:
1. Your database is running (`docker-compose up -d`)
2. Database migrations are up to date
3. Test data won't conflict with production data

## Notes

- Tests use Bun's built-in test runner
- Each test file creates its own Fastify instance
- Tests are isolated and don't depend on each other
- Use unique identifiers (timestamps, random values) to avoid conflicts
