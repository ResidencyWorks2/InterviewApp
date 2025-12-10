/**
 * Integration tests for checklist completion rate limiting
 * Tests rate limiting on POST /api/checklist/complete endpoint
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/checklist/complete/route";

// Mock dependencies
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockUpsert = vi.fn();
const mockTrack = vi.fn();

vi.mock("@/infrastructure/supabase/server", () => ({
	createClient: vi.fn(() => ({
		auth: {
			getUser: () => mockGetUser(),
		},
		from: mockFrom,
	})),
}));

vi.mock("@/infrastructure/posthog/client", () => ({
	createPostHogConfig: vi.fn(() => ({})),
	toAnalyticsServiceConfig: vi.fn(() => ({})),
}));

vi.mock(
	"@/features/notifications/infrastructure/posthog/AnalyticsService",
	() => ({
		PostHogAnalyticsService: class {
			constructor() {}
			track = mockTrack;
		},
	}),
);

describe("Integration: Checklist Completion Rate Limiting", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-test-rate-limit" } },
			error: null,
		});
		mockTrack.mockResolvedValue(undefined);
	});

	it("should allow 10 requests per minute per user", async () => {
		const evalId = "123e4567-e89b-12d3-a456-426614174000";

		// Mock successful database operations
		mockFrom.mockReturnValue({
			upsert: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: "completion-1" },
						error: null,
					}),
				}),
			}),
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { category: "Communication" },
						error: null,
					}),
				}),
			}),
		});

		// Make 10 requests - all should succeed
		for (let i = 0; i < 10; i++) {
			const templateId = `987fcdeb-51a2-43d7-b${i.toString().padStart(3, "0")}-426614174000`;

			const request = new NextRequest(
				"http://localhost/api/checklist/complete",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						evaluation_id: evalId,
						template_id: templateId,
						completed: true,
					}),
				},
			);

			const response = await POST(request);
			expect(response.status).toBe(200);
		}
	});

	it("should return 429 when rate limit is exceeded", async () => {
		const evalId = "123e4567-e89b-12d3-a456-426614174000";

		// Mock successful database operations
		mockFrom.mockReturnValue({
			upsert: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: "completion-1" },
						error: null,
					}),
				}),
			}),
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { category: "Communication" },
						error: null,
					}),
				}),
			}),
		});

		// Make 10 requests first (all should succeed)
		for (let i = 0; i < 10; i++) {
			const templateId = `987fcdeb-51a2-43d7-b${i.toString().padStart(3, "0")}-426614174000`;

			const request = new NextRequest(
				"http://localhost/api/checklist/complete",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						evaluation_id: evalId,
						template_id: templateId,
						completed: true,
					}),
				},
			);

			await POST(request);
		}

		// 11th request should be rate limited
		const templateId = "987fcdeb-51a2-43d7-b010-426614174000";
		const request = new NextRequest("http://localhost/api/checklist/complete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				evaluation_id: evalId,
				template_id: templateId,
				completed: true,
			}),
		});

		const response = await POST(request);
		const json = await response.json();

		expect(response.status).toBe(429);
		expect(json.error).toBe("rate_limit_exceeded");
		expect(json.retry_after).toBeDefined();
		expect(json.limit).toBe(10);
	});

	it("should include Retry-After header in rate limit response", async () => {
		const evalId = "123e4567-e89b-12d3-a456-426614174000";

		mockFrom.mockReturnValue({
			upsert: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: "completion-1" },
						error: null,
					}),
				}),
			}),
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { category: "Communication" },
						error: null,
					}),
				}),
			}),
		});

		// Exceed rate limit
		for (let i = 0; i < 11; i++) {
			const templateId = `987fcdeb-51a2-43d7-b${i.toString().padStart(3, "0")}-426614174000`;

			const request = new NextRequest(
				"http://localhost/api/checklist/complete",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						evaluation_id: evalId,
						template_id: templateId,
						completed: true,
					}),
				},
			);

			await POST(request);
		}

		// Check last response
		const templateId = "987fcdeb-51a2-43d7-b011-426614174000";
		const request = new NextRequest("http://localhost/api/checklist/complete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				evaluation_id: evalId,
				template_id: templateId,
				completed: true,
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(429);
		const retryAfter = response.headers.get("Retry-After");
		expect(retryAfter).toBeDefined();
		expect(Number.parseInt(retryAfter || "0", 10)).toBeGreaterThan(0);
	});

	it("should enforce rate limit correctly", async () => {
		// Verify rate limit structure and enforcement
		// Note: Testing time-based reset would require time manipulation
		// This test verifies the rate limit is correctly enforced
		// Use unique user ID to avoid interference from other tests
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-test-enforce-limit" } },
			error: null,
		});

		const evalId = "123e4567-e89b-12d3-a456-426614174000";

		mockFrom.mockReturnValue({
			upsert: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: "completion-1" },
						error: null,
					}),
				}),
			}),
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { category: "Communication" },
						error: null,
					}),
				}),
			}),
		});

		// Make requests up to limit (all should succeed)
		for (let i = 0; i < 10; i++) {
			const templateId = `987fcdeb-51a2-43d7-b${i.toString().padStart(3, "0")}-426614174000`;

			const request = new NextRequest(
				"http://localhost/api/checklist/complete",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						evaluation_id: evalId,
						template_id: templateId,
						completed: true,
					}),
				},
			);

			const response = await POST(request);
			expect(response.status).toBe(200);
		}

		// Verify rate limit is enforced (11th request should fail)
		const templateId = "987fcdeb-51a2-43d7-b010-426614174000";
		const request = new NextRequest("http://localhost/api/checklist/complete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				evaluation_id: evalId,
				template_id: templateId,
				completed: true,
			}),
		});

		const response = await POST(request);
		expect(response.status).toBe(429);
		const json = await response.json();
		expect(json.error).toBe("rate_limit_exceeded");
		expect(json.retry_after).toBeDefined();
		expect(json.limit).toBe(10);
	});
});
