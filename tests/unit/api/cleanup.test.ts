/**
 * Unit tests for /api/cleanup route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/cleanup/route";

// Mock cleanup function
const mockCleanupExpiredRecordings = vi.fn();

vi.mock("@/features/booking/infrastructure/storage/lifecycle", () => ({
	cleanupExpiredRecordings: () => mockCleanupExpiredRecordings(),
}));

describe("/api/cleanup", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET", () => {
		it("should return endpoint information", async () => {
			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toContain("Cleanup endpoint");
			expect(data.endpoint).toBe("/api/cleanup");
			expect(data.method).toBe("POST");
			expect(data.description).toBeDefined();
		});
	});

	describe("POST", () => {
		it("should trigger cleanup and return success", async () => {
			mockCleanupExpiredRecordings.mockResolvedValue({
				success: true,
				deletedCount: 5,
				expiredRecordings: [
					{ id: "1", expires_at: "2024-01-01" },
					{ id: "2", expires_at: "2024-01-02" },
				],
				errors: [],
			});

			const request = new NextRequest("http://localhost/api/cleanup", {
				method: "POST",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.deletedCount).toBe(5);
			expect(data.totalExpired).toBe(2);
			expect(data.errors).toEqual([]);
			expect(data.timestamp).toBeDefined();
		});

		it("should handle cleanup failures gracefully", async () => {
			mockCleanupExpiredRecordings.mockResolvedValue({
				success: false,
				deletedCount: 0,
				expiredRecordings: [],
				errors: ["Failed to delete recording 1"],
			});

			const request = new NextRequest("http://localhost/api/cleanup", {
				method: "POST",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(false);
			expect(data.deletedCount).toBe(0);
			expect(data.errors).toContain("Failed to delete recording 1");
		});

		it("should handle errors and return 500", async () => {
			mockCleanupExpiredRecordings.mockRejectedValue(
				new Error("Database connection failed"),
			);

			const request = new NextRequest("http://localhost/api/cleanup", {
				method: "POST",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("INTERNAL_ERROR");
			expect(data.error.message).toBe("Database connection failed");
		});

		it("should handle non-Error exceptions", async () => {
			mockCleanupExpiredRecordings.mockRejectedValue("String error");

			const request = new NextRequest("http://localhost/api/cleanup", {
				method: "POST",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.success).toBe(false);
			expect(data.error.message).toBe("Internal server error");
		});

		it("should handle cleanup with multiple expired recordings", async () => {
			const expiredRecordings = Array.from({ length: 10 }, (_, i) => ({
				id: `recording-${i}`,
				expires_at: "2024-01-01",
			}));

			mockCleanupExpiredRecordings.mockResolvedValue({
				success: true,
				deletedCount: 10,
				expiredRecordings,
				errors: [],
			});

			const request = new NextRequest("http://localhost/api/cleanup", {
				method: "POST",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.deletedCount).toBe(10);
			expect(data.totalExpired).toBe(10);
		});
	});
});
