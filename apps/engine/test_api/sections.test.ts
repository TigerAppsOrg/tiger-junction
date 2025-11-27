// test_api/sections.test.ts
import { describe, it, expect, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3000";

describe("Sections API", () => {
  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe("GET /api/sections/:term", () => {
    it("should return all sections for a valid term", async () => {
      const term = 1262; // Example term
      const response = await fetch(`${BASE_URL}/api/sections/${term}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty("count");
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const section = data.data[0];
        expect(section).toHaveProperty("id");
        expect(section).toHaveProperty("courseId");
        expect(section).toHaveProperty("title");
        expect(section).toHaveProperty("num");
        expect(section).toHaveProperty("tot");
        expect(section).toHaveProperty("cap");
        expect(section).toHaveProperty("days");
        expect(section).toHaveProperty("startTime");
        expect(section).toHaveProperty("endTime");
        expect(section).toHaveProperty("status");
      }
    });

    it("should handle invalid term parameter", async () => {
      const response = await fetch(`${BASE_URL}/api/sections/invalid`);

      // Fastify schema validation will return 400 for invalid type
      expect(response.status).toBe(400);
    });

    it("should return empty array for non-existent term", async () => {
      const response = await fetch(`${BASE_URL}/api/sections/9999`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(0);
      expect(data.data).toEqual([]);
    });
  });

  describe("Section data validation", () => {
    it("should have valid enrollment numbers", async () => {
      const term = 1262;
      const response = await fetch(`${BASE_URL}/api/sections/${term}`);
      const data = await response.json();

      data.data.forEach((section: any) => {
        expect(section.tot).toBeGreaterThanOrEqual(0);
        expect(section.cap).toBeGreaterThanOrEqual(0);
        expect(section.tot).toBeLessThanOrEqual(section.cap + 10); // Allow some overflow
      });
    });

    it("should have valid time ranges", async () => {
      const term = 1262;
      const response = await fetch(`${BASE_URL}/api/sections/${term}`);
      const data = await response.json();

      data.data.forEach((section: any) => {
        if (section.startTime !== null && section.endTime !== null) {
          expect(section.startTime).toBeGreaterThanOrEqual(0);
          expect(section.startTime).toBeLessThan(2400);
          expect(section.endTime).toBeGreaterThan(section.startTime);
          expect(section.endTime).toBeLessThanOrEqual(2400);
        }
      });
    });

    it("should have valid days bitmask", async () => {
      const term = 1262;
      const response = await fetch(`${BASE_URL}/api/sections/${term}`);
      const data = await response.json();

      data.data.forEach((section: any) => {
        // Days should be a bitmask from 0 (no days) to 127 (all 7 days)
        expect(section.days).toBeGreaterThanOrEqual(0);
        expect(section.days).toBeLessThanOrEqual(127);
      });
    });

    it("should have valid status values", async () => {
      const term = 1262;
      const response = await fetch(`${BASE_URL}/api/sections/${term}`);
      const data = await response.json();

      const validStatuses = ["Open", "Closed", "Canceled"];
      data.data.forEach((section: any) => {
        expect(validStatuses).toContain(section.status);
      });
    });
  });
});
