// test_api/feedback.test.ts
import { describe, it, expect, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3000";

describe("Feedback API", () => {
  const testUserId = 1; // Assuming user 1 exists

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe("POST /api/feedback", () => {
    it("should submit feedback successfully", async () => {
      const feedbackData = {
        userId: testUserId,
        feedback: "This is a test feedback. The app is great!"
      };

      const response = await fetch(`${BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackData)
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("id");
      expect(data.data.userId).toBe(testUserId);
      expect(data.data.feedback).toBe(feedbackData.feedback);
      expect(data.data.isResolved).toBe(false);
      expect(data.data).toHaveProperty("createdAt");
    });

    it("should reject feedback without userId", async () => {
      const response = await fetch(`${BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: "Missing userId" })
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject feedback without feedback text", async () => {
      const response = await fetch(`${BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: testUserId })
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle empty feedback string", async () => {
      const response = await fetch(`${BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: testUserId, feedback: "" })
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle long feedback text", async () => {
      const longFeedback = "A".repeat(5000); // Very long feedback
      const feedbackData = {
        userId: testUserId,
        feedback: longFeedback
      };

      const response = await fetch(`${BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackData)
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.feedback).toBe(longFeedback);
    });
  });
});
