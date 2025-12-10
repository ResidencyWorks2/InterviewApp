/**
 * Unit tests for /api/migrations route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/migrations/route";

// Mock logger
vi.mock("@/infrastructure/logging/logger", () => ({
	logger: {
		error: vi.fn(),
	},
}));

describe("/api/migrations", () => {
	describe("GET", () => {
		it("should return status information for default action", async () => {
			const request = new NextRequest("http://localhost/api/migrations", {
				method: "GET",
			});

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.status.message).toContain("Supabase CLI");
			expect(data.status.instructions).toBeInstanceOf(Array);
			expect(data.status.migrationFiles).toBeInstanceOf(Array);
		});

		it("should return status information for status action", async () => {
			const request = new NextRequest(
				"http://localhost/api/migrations?action=status",
				{ method: "GET" },
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.status).toBeDefined();
		});

		it("should return current version information", async () => {
			const request = new NextRequest(
				"http://localhost/api/migrations?action=current-version",
				{ method: "GET" },
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.version.message).toContain("supabase migration list");
		});

		it("should return validation information", async () => {
			const request = new NextRequest(
				"http://localhost/api/migrations?action=validate",
				{ method: "GET" },
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.valid).toBe(true);
			expect(data.message).toBeDefined();
		});

		it("should return error for invalid action", async () => {
			const request = new NextRequest(
				"http://localhost/api/migrations?action=invalid",
				{ method: "GET" },
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("Invalid action");
		});

		it("should handle errors", async () => {
			const request = {
				url: "invalid-url",
			} as unknown as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBeDefined();
		});
	});

	describe("POST", () => {
		it("should return run instructions for run action", async () => {
			const request = new NextRequest("http://localhost/api/migrations", {
				method: "POST",
				body: JSON.stringify({ action: "run" }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toContain("Supabase CLI");
			expect(data.instructions).toBeDefined();
		});

		it("should return rollback instructions for rollback action", async () => {
			const request = new NextRequest("http://localhost/api/migrations", {
				method: "POST",
				body: JSON.stringify({ action: "rollback" }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toContain("Rollbacks");
		});

		it("should return rollback instructions for rollback-to-version action", async () => {
			const request = new NextRequest("http://localhost/api/migrations", {
				method: "POST",
				body: JSON.stringify({ action: "rollback-to-version" }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toContain("Version rollbacks");
		});

		it("should return error for missing action", async () => {
			const request = new NextRequest("http://localhost/api/migrations", {
				method: "POST",
				body: JSON.stringify({}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("Missing required field: action");
		});

		it("should return error for invalid action", async () => {
			const request = new NextRequest("http://localhost/api/migrations", {
				method: "POST",
				body: JSON.stringify({ action: "invalid" }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("Invalid action");
		});

		it("should handle errors", async () => {
			const request = {
				json: async () => {
					throw new Error("Parse error");
				},
			} as unknown as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBeDefined();
		});
	});
});
