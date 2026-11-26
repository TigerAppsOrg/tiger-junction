# TigerJunction Engine (Backend)

This directory contains the backend for TigerJunction (the "Engine"). It is built using [Fastify](https://www.fastify.io/) and TypeScript.

## Local Development Setup

### Prerequisites

- [Bun](https://bun.sh/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Steps

1. Install dependencies:

```bash
bun install
```

2. Set up environment variables. The default variables in `.env.example` connect to the local PostgreSQL and Redis instances set up by Docker Compose.

```bash
   cp .env.example .env
```

3. Start database services using Docker Compose:

```bash
bun run docker:up
```

4. Run database migrations:

```bash
bun run db:migrate
```

5. Start the development server:

```bash
bun run dev
```

The server will be running at `http://localhost:3000`.

### Available Commands

**Application**

- `bun start` - Start the application
- `bun run cli` - Run CLI commands
- `bun run format` - Format code with Prettier
- `bun run lint` - Lint code with ESLint

**Docker Services**

- `bun run docker:up` - Start PostgreSQL and Redis containers
- `bun run docker:down` - Stop containers (**preserves** data)
- `bun run docker:logs` - View container logs
- `bun run docker:restart` - Restart containers
- `bun run docker:ps` - List running containers
- `bun run docker:clean` - Stop containers and **delete** all data

**Database**

- `bun run db:generate` - Generate migration files from schema changes
- `bun run db:migrate` - Apply migrations to database
- `bun run db:studio` - Open Drizzle Studio to browse database
- `bun run db:schema` - Generate DBML schema file

### Cleaning Up

```bash
bun run docker:down
```

To completely reset your local database:

```bash
bun run docker:clean
bun run docker:up
bun run db:push
```

### Published course MCP reads

The junction/full MCP scopes expose `list_published_terms`,
`search_published_courses(term, department?, query?, limit?, offset?)` and
`get_published_course(term, courseId)`. They read Princeton OIT directly, using
`CONSUMER_KEY` and `CONSUMER_SECRET` or the existing `API_ACCESS_TOKEN`, instead of
waiting for the imported course database to refresh. All are read-only. Successful
public responses are cached for five minutes, with fetch time and source links.
No user identity is sent to OIT. These tools do not populate the local database.

Search returns published instructors and section meetings with query pagination.
Details return prerequisite/restriction text, distributions and grading basis.
They do not certify degree eligibility, complete section coverage or current seat
availability. A missing term, an API error and a successful empty query remain
distinct. The terms endpoint may list only the currently published term, not all
historical terms. Explicit term queries never silently substitute another term.

Run `bun test src/tests/published-courses.test.ts` for isolated MCP fixture checks.
The full `bun run test` also needs the repository's local database/services.
Before production rollout, smoke-test an explicit upcoming term, a non-COS
department and course details using valid OIT credentials. Confirm times and
prerequisite text against the Registrar. Do not call an import complete based on
these reads or expose API credentials to PI or any assistant client.
