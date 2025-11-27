// test_api/schedules.test.ts
// Author(s): Joshua Lau

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import Fastify, { FastifyInstance } from "fastify";
import fastifySensible from "@fastify/sensible";
import schedulesRoutes from "../src/routes/api/schedules/index.js";

describe("Schedules API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(fastifySensible);
    await app.register(schedulesRoutes, { prefix: "/api/schedules" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/schedules", () => {
    it("should successfully create a new schedule", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/schedules",
        payload: {
          userId: 1,
          term: 1252,
          title: "Test Schedule",
          relativeId: 1,
          isPublic: false
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.userId).toBe(1);
      expect(body.data.term).toBe(1252);
      expect(body.data.title).toBe("Test Schedule");
      expect(body.data.isPublic).toBe(false);
      expect(body.data.id).toBeGreaterThan(0);
    });

    it("should default isPublic to false when not provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/schedules",
        payload: {
          userId: 1,
          term: 1252,
          title: "Private Schedule",
          relativeId: 2
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.isPublic).toBe(false);
    });

    it("should return 400 when missing required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/schedules",
        payload: {
          userId: 1,
          term: 1252
          // missing title and relativeId
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/schedules/:scheduleId", () => {
    it("should return 404 for non-existent schedule", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/schedules/999999"
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain("not found");
    });
  });

  describe("PATCH /api/schedules/:scheduleId", () => {
    it("should return 404 when updating non-existent schedule", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/schedules/999999",
        payload: {
          title: "Updated Title"
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain("not found");
    });

    it("should return 400 when title is missing", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/schedules/1",
        payload: {}
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("DELETE /api/schedules/:scheduleId", () => {
    it("should return 404 when deleting non-existent schedule", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/schedules/999999"
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain("not found");
    });
  });

  describe("Schedule CRUD operations", () => {
    it("should create, retrieve, update, and delete a schedule", async () => {
      // Create
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/schedules",
        payload: {
          userId: 1,
          term: 1252,
          title: "CRUD Test Schedule",
          relativeId: 99,
          isPublic: false
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const createBody = JSON.parse(createResponse.body);
      const scheduleId = createBody.data.id;

      // Retrieve
      const getResponse = await app.inject({
        method: "GET",
        url: `/api/schedules/${scheduleId}`
      });

      expect(getResponse.statusCode).toBe(200);
      const getBody = JSON.parse(getResponse.body);
      expect(getBody.data.title).toBe("CRUD Test Schedule");

      // Update
      const updateResponse = await app.inject({
        method: "PATCH",
        url: `/api/schedules/${scheduleId}`,
        payload: {
          title: "Updated CRUD Schedule"
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      const updateBody = JSON.parse(updateResponse.body);
      expect(updateBody.data.title).toBe("Updated CRUD Schedule");

      // Delete
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/api/schedules/${scheduleId}`
      });

      expect(deleteResponse.statusCode).toBe(200);
      const deleteBody = JSON.parse(deleteResponse.body);
      expect(deleteBody.success).toBe(true);

      // Verify deletion
      const verifyResponse = await app.inject({
        method: "GET",
        url: `/api/schedules/${scheduleId}`
      });

      expect(verifyResponse.statusCode).toBe(404);
    });
  });
});
