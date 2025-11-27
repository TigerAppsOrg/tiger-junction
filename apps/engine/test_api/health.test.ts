// test_api/health.test.ts
// Author(s): Joshua Lau

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import Fastify, { FastifyInstance } from "fastify";
import fastifySensible from "@fastify/sensible";
import healthRoutes from "../src/routes/health.js";

describe("Health API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(fastifySensible);
    await app.register(healthRoutes, { prefix: "/health" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("should return status ok", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("ok");
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).getTime()).toBeGreaterThan(0);
    });

    it("should return valid ISO timestamp", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health"
      });

      const body = JSON.parse(response.body);
      const timestamp = new Date(body.timestamp);
      expect(timestamp instanceof Date).toBe(true);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });
  });

  describe("GET /health/detailed", () => {
    it("should return detailed health information", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health/detailed"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Check basic fields
      expect(body.status).toBe("ok");
      expect(body.timestamp).toBeDefined();
      expect(typeof body.uptime).toBe("number");
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      
      // Check memory information
      expect(body.memory).toBeDefined();
      expect(typeof body.memory.heapUsedMB).toBe("number");
      expect(typeof body.memory.heapTotalMB).toBe("number");
      expect(typeof body.memory.rssMB).toBe("number");
      expect(typeof body.memory.systemFreeMB).toBe("number");
      expect(typeof body.memory.systemTotalMB).toBe("number");
      
      // Memory values should be positive
      expect(body.memory.heapUsedMB).toBeGreaterThan(0);
      expect(body.memory.heapTotalMB).toBeGreaterThan(0);
      expect(body.memory.rssMB).toBeGreaterThan(0);
      
      // Check environment info
      expect(body.environment).toBeDefined();
      expect(body.nodeVersion).toBeDefined();
      expect(body.platform).toBeDefined();
    });

    it("should have reasonable heap memory values", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health/detailed"
      });

      const body = JSON.parse(response.body);
      // Heap used and total should both be positive and reasonable
      expect(body.memory.heapUsedMB).toBeGreaterThan(0);
      expect(body.memory.heapTotalMB).toBeGreaterThan(0);
      // Allow for memory growth and rounding differences
      expect(body.memory.heapUsedMB).toBeLessThan(body.memory.heapTotalMB + 10);
    });

    it("should report system memory correctly", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health/detailed"
      });

      const body = JSON.parse(response.body);
      expect(body.memory.systemFreeMB).toBeLessThanOrEqual(body.memory.systemTotalMB);
      expect(body.memory.systemTotalMB).toBeGreaterThan(0);
    });

    it("should include platform and version information", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health/detailed"
      });

      const body = JSON.parse(response.body);
      expect(body.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
      expect(body.platform).toContain(" ");
      expect(body.platform.length).toBeGreaterThan(0);
    });
  });
});
