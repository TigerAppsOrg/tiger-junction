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
