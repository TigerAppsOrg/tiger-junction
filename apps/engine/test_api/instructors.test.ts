// test_api/instructors.test.ts
import { describe, it, expect, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3000";

describe("Instructors API", () => {
  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe("GET /api/instructors", () => {
    it("should return all instructors", async () => {
      const response = await fetch(`${BASE_URL}/api/instructors`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty("count");
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const instructor = data.data[0];
        expect(instructor).toHaveProperty("netid");
        expect(instructor).toHaveProperty("emplid");
        expect(instructor).toHaveProperty("name");
        expect(instructor).toHaveProperty("fullName");
        expect(instructor).toHaveProperty("department");
        expect(instructor).toHaveProperty("email");
      }
    });

    it("should return instructors in alphabetical order", async () => {
      const response = await fetch(`${BASE_URL}/api/instructors`);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.data.length > 1) {
        const names = data.data.map((i: any) => i.name);
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);
      }
    });
  });

  describe("GET /api/instructors/:netid", () => {
    it("should return a specific instructor by netid", async () => {
      // First get all instructors to find a valid netid
      const allResponse = await fetch(`${BASE_URL}/api/instructors`);
      const allData = await allResponse.json();

      if (allData.data.length > 0) {
        const netid = allData.data[0].netid;
        const response = await fetch(`${BASE_URL}/api/instructors/${netid}`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty("netid", netid);
        expect(data.data).toHaveProperty("name");
        expect(data.data).toHaveProperty("fullName");
      }
    });

    it("should return 404 for non-existent instructor", async () => {
      const response = await fetch(`${BASE_URL}/api/instructors/nonexistent123`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });

    it("should handle special characters in netid", async () => {
      const response = await fetch(`${BASE_URL}/api/instructors/test@123`);
      const data = await response.json();

      // Should either return 404 or handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Instructor data integrity", () => {
    it("should have valid rating values", async () => {
      const response = await fetch(`${BASE_URL}/api/instructors`);
      const data = await response.json();

      data.data.forEach((instructor: any) => {
        if (instructor.rating !== null) {
          expect(instructor.rating).toBeGreaterThanOrEqual(0);
          expect(instructor.rating).toBeLessThanOrEqual(5);
        }
        if (instructor.ratingUncertainty !== null) {
          expect(instructor.ratingUncertainty).toBeGreaterThanOrEqual(0);
        }
        if (instructor.numRatings !== null) {
          expect(instructor.numRatings).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it("should have valid email format when present", async () => {
      const response = await fetch(`${BASE_URL}/api/instructors`);
      const data = await response.json();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      data.data.forEach((instructor: any) => {
        if (instructor.email !== null && instructor.email !== "") {
          expect(emailRegex.test(instructor.email)).toBe(true);
        }
      });
    });
  });
});
