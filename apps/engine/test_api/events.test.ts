// test_api/events.test.ts
import { describe, it, expect, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3000";

describe("Events API", () => {
  let testEventId: number;
  let testUserId: number = 1; // Assuming user 1 exists

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe("POST /api/events", () => {
    it("should create a new custom event", async () => {
      const eventData = {
        userId: testUserId,
        title: "Test Event",
        times: {
          Monday: [{ start: 900, end: 1000 }],
          Wednesday: [{ start: 900, end: 1000 }]
        }
      };

      const response = await fetch(`${BASE_URL}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData)
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("id");
      expect(data.data.userId).toBe(testUserId);
      expect(data.data.title).toBe("Test Event");
      expect(data.data).toHaveProperty("times");

      testEventId = data.data.id;
    });

    it("should reject event with missing fields", async () => {
      const response = await fetch(`${BASE_URL}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 1 })
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/events/:eventId/schedules", () => {
    it("should get schedule associations for an event", async () => {
      if (!testEventId) {
        // Create event first
        const eventData = {
          userId: testUserId,
          title: "Test Event For Schedule",
          times: { Monday: [{ start: 900, end: 1000 }] }
        };
        const createResponse = await fetch(`${BASE_URL}/api/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData)
        });
        const createData = await createResponse.json();
        testEventId = createData.data.id;
      }

      const response = await fetch(`${BASE_URL}/api/events/${testEventId}/schedules`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty("count");
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe("PATCH /api/events/:eventId", () => {
    it("should update an existing event", async () => {
      if (!testEventId) {
        const eventData = {
          userId: testUserId,
          title: "Event to Update",
          times: { Tuesday: [{ start: 1000, end: 1100 }] }
        };
        const createResponse = await fetch(`${BASE_URL}/api/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData)
        });
        const createData = await createResponse.json();
        testEventId = createData.data.id;
      }

      const updateData = {
        title: "Updated Event Title",
        times: { Thursday: [{ start: 1400, end: 1500 }] }
      };

      const response = await fetch(`${BASE_URL}/api/events/${testEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("Updated Event Title");
    });

    it("should return 404 for non-existent event", async () => {
      const response = await fetch(`${BASE_URL}/api/events/999999`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test" })
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe("DELETE /api/events/:eventId", () => {
    it("should delete an event", async () => {
      // Create a new event to delete
      const eventData = {
        userId: testUserId,
        title: "Event to Delete",
        times: { Friday: [{ start: 1500, end: 1600 }] }
      };
      const createResponse = await fetch(`${BASE_URL}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData)
      });
      const createData = await createResponse.json();
      const eventToDelete = createData.data.id;

      const response = await fetch(`${BASE_URL}/api/events/${eventToDelete}`, {
        method: "DELETE"
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("deleted");
    });

    it("should return 404 when deleting non-existent event", async () => {
      const response = await fetch(`${BASE_URL}/api/events/999999`, {
        method: "DELETE"
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});
