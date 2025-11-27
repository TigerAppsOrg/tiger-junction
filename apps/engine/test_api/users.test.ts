// test_api/users.test.ts
// Author(s): Joshua Lau

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import Fastify, { FastifyInstance } from "fastify";
import fastifySensible from "@fastify/sensible";
import usersRoutes from "../src/routes/api/users.js";

describe("Users API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(fastifySensible);
    await app.register(usersRoutes, { prefix: "/api/users" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/users/register", () => {
    it("should successfully register a new user with valid data", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users/register",
        payload: {
          email: "test@princeton.edu",
          netid: `testuser${Date.now()}`,
          year: 2026
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.email).toBe("test@princeton.edu");
      expect(body.data.netid).toContain("testuser");
      expect(body.data.year).toBe(2026);
      expect(body.data.isAdmin).toBe(false);
      expect(body.data.theme).toEqual({});
      expect(body.data.id).toBeGreaterThan(0);
    });

    it("should return 400 when missing required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users/register",
        payload: {
          email: "test@princeton.edu"
          // missing netid and year
        }
      });

      // Fastify schema validation returns 400 for missing required fields
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when email is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users/register",
        payload: {
          email: "invalid-email",
          netid: `testuser${Date.now()}`,
          year: 2026
        }
      });

      // Fastify schema validation returns 400 for invalid email format
      expect(response.statusCode).toBe(400);
    });

    it("should return 409 when registering duplicate netid", async () => {
      const netid = `duplicate${Date.now()}`;
      
      // First registration
      await app.inject({
        method: "POST",
        url: "/api/users/register",
        payload: {
          email: "first@princeton.edu",
          netid,
          year: 2026
        }
      });

      // Attempt duplicate registration
      const response = await app.inject({
        method: "POST",
        url: "/api/users/register",
        payload: {
          email: "second@princeton.edu",
          netid,
          year: 2027
        }
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain("already exists");
    });

    it("should handle different graduation years correctly", async () => {
      const testYears = [2024, 2025, 2026, 2027];
      
      for (const year of testYears) {
        const response = await app.inject({
          method: "POST",
          url: "/api/users/register",
          payload: {
            email: `student${year}@princeton.edu`,
            netid: `student${year}_${Date.now()}`,
            year
          }
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.data.year).toBe(year);
      }
    });

    it("should properly format email addresses", async () => {
      const emails = [
        "user@princeton.edu",
        "first.last@cs.princeton.edu",
        "user+tag@princeton.edu"
      ];

      for (const email of emails) {
        const response = await app.inject({
          method: "POST",
          url: "/api/users/register",
          payload: {
            email,
            netid: `user${Date.now()}_${Math.random()}`,
            year: 2026
          }
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.data.email).toBe(email);
      }
    });
  });

  describe("GET /api/users/:userId/schedules", () => {
    it("should return empty array for user with no schedules", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users/999999/schedules"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.count).toBe(0);
      expect(body.data).toEqual([]);
    });

    it("should filter schedules by term when provided", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users/1/schedules?term=1252"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("GET /api/users/:userId/events", () => {
    it("should return empty array for user with no events", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users/999999/events"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.count).toBe(0);
      expect(body.data).toEqual([]);
    });

    it("should return events array with proper structure", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users/1/events"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.count).toBe("number");
    });
  });
});
