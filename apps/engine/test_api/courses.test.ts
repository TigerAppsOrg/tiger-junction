// test_api/courses.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";

const BASE_URL = "http://localhost:3000";
let server: any;

describe("Courses API", () => {
  beforeAll(async () => {
    // Give server time to start if not already running
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe("GET /api/courses/all", () => {
    it("should return all courses with instructors", async () => {
      const response = await fetch(`${BASE_URL}/api/courses/all`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty("count");
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const course = data.data[0];
        expect(course).toHaveProperty("id");
        expect(course).toHaveProperty("listingId");
        expect(course).toHaveProperty("term");
        expect(course).toHaveProperty("code");
        expect(course).toHaveProperty("title");
        expect(course).toHaveProperty("description");
        expect(course).toHaveProperty("instructors");
        expect(Array.isArray(course.instructors)).toBe(true);
      }
    });
  });

  describe("GET /api/courses/:term", () => {
    it("should return courses for a specific term", async () => {
      const term = 1262; // Example term
      const response = await fetch(`${BASE_URL}/api/courses/${term}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty("count");
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);

      // All courses should be from the specified term
      data.data.forEach((course: any) => {
        expect(course.term).toBe(term);
      });
    });

    it("should handle invalid term parameter", async () => {
      const response = await fetch(`${BASE_URL}/api/courses/invalid`);

      // Fastify schema validation will return 400 for invalid type
      expect(response.status).toBe(400);
    });

    it("should return empty array for non-existent term", async () => {
      const response = await fetch(`${BASE_URL}/api/courses/9999`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(0);
      expect(data.data).toEqual([]);
    });
  });
});
