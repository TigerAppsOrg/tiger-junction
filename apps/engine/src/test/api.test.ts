import { describe, it, expect } from "vitest";
import { Elysia } from "elysia";
import { apiRoutes } from "../routes";

describe("API Routes", () => {
  const app = new Elysia().use(apiRoutes);

  it('should return "Hello World" for GET /api/hello', async () => {
    const response = await app.handle(
      new Request("http://localhost/api/hello")
    );

    const body = await response.text();
    expect(body).toBe("Hello World");
  });

  it('should return "Goodbye World" for GET /api/goodbye', async () => {
    const response = await app.handle(
      new Request("http://localhost/api/goodbye")
    );

    const body = await response.text();
    expect(body).toBe("Goodbye World");
  });
});
