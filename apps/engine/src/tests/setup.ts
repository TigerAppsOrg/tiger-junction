// src/tests/setup.ts
// Shared test helper — builds the Fastify app once per test file.

import { type FastifyInstance } from "fastify";
import { build } from "../app.ts";

let app: FastifyInstance | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await build({ logger: false });
    await app.ready();
  }
  return app;
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
}
