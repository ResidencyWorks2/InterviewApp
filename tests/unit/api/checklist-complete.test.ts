/**
 * Unit tests for /api/checklist/complete route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/checklist/complete/route";

// Mock dependencies
const mockGetUser = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();
const mockTrack = vi.fn();
const mockSupabase = {
	auth: {
		getUser: mockGetUser,
	},
	from: mockFrom,
};

vi.mock("@/infrastructure/supabase/server", () => ({
	createClient: vi.fn(() => mockSupabase),
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

describe("/api/checklist/complete", () => {
	let testUserCounter = 0;

	beforeEach(() => {
		vi.clearAllMocks();
		// Use unique user ID for each test to avoid rate limiting issues
		testUserCounter++;
		mockGetUser.mockResolvedValue({
			data: { user: { id: `user-test-${testUserCounter}` } },
			error: null,
		});
		mockTrack.mockResolvedValue(undefined);
		// Reset mockFrom
		mockFrom.mockReset();
	});

	describe("POST", () => {
		it("should mark checklist item as completed", async () => {
			const evalId = "123e4567-e89b-12d3-a456-426614174000";
			const templateId = "987fcdeb-51a2-43d7-b123-426614174000";

			const mockCompletion = {
				id: "completion-1",
				user_id: "user-123",
				template_id: templateId,
				evaluation_id: evalId,
			};

			mockFrom
				.mockReturnValueOnce({
					upsert: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: mockCompletion,
								error: null,
							}),
						}),
					}),
				})
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { category: "Communication" },
								error: null,
							}),
						}),
					}),
				});

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
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.completed).toBe(true);
			expect(json.data.completion).toEqual(mockCompletion);
		});

		it("should unmark checklist item as completed", async () => {
			mockFrom.mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({
								data: null,
								error: null,
							}),
						}),
					}),
				}),
			});

			const evalId = "123e4567-e89b-12d3-a456-426614174000";
			const templateId = "987fcdeb-51a2-43d7-b123-426614174000";

			const request = new NextRequest(
				"http://localhost/api/checklist/complete",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						evaluation_id: evalId,
						template_id: templateId,
						completed: false,
					}),
				},
			);

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.completed).toBe(false);
		});

		it("should return 401 when user is not authenticated", async () => {
			const evalId = "123e4567-e89b-12d3-a456-426614174000";
			const templateId = "987fcdeb-51a2-43d7-b123-426614174000";

			mockGetUser.mockResolvedValue({
				data: { user: null },
				error: { message: "Not authenticated" },
			});

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

			expect(response.status).toBe(401);
		});

		it("should return 400 when validation fails", async () => {
			const requestBody = {}; // Missing required fields

			const request = new NextRequest(
				"http://localhost/api/checklist/complete",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(requestBody),
				},
			);

			vi.spyOn(request, "json").mockResolvedValue(requestBody);

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(422); // Zod validation returns 422
			expect(json.error).toContain("Invalid request payload");
		});

		it("should return 429 when rate limit exceeded", async () => {
			const evalId = "123e4567-e89b-12d3-a456-426614174000";

			// Make 10 requests first (all should succeed)
			for (let i = 0; i < 10; i++) {
				const templateId = `987fcdeb-51a2-43d7-b${i.toString().padStart(3, "0")}-426614174000`;

				mockFrom.mockReset();
				mockFrom
					.mockReturnValueOnce({
						upsert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: `completion-${i}` },
									error: null,
								}),
							}),
						}),
					})
					.mockReturnValueOnce({
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { category: "Communication" },
									error: null,
								}),
							}),
						}),
					});

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
			expect(response.status).toBe(429);
		});

		it("should return 500 on database error", async () => {
			const evalId = "123e4567-e89b-12d3-a456-426614174000";
			const templateId = "987fcdeb-51a2-43d7-b123-426614174000";

			mockFrom.mockReturnValue({
				upsert: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { message: "Database error" },
						}),
					}),
				}),
			});

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
			const json = await response.json();

			expect(response.status).toBe(500);
			expect(json.error).toBe("Failed to update checklist");
		});

		it("should handle analytics failure gracefully", async () => {
			const evalId = "123e4567-e89b-12d3-a456-426614174000";
			const templateId = "987fcdeb-51a2-43d7-b123-426614174000";

			// Use a different user ID to avoid rate limiting from previous tests
			mockGetUser.mockResolvedValue({
				data: { user: { id: "user-analytics-test" } },
				error: null,
			});

			mockTrack.mockRejectedValue(new Error("Analytics error"));

			mockFrom.mockReset();
			mockFrom
				.mockReturnValueOnce({
					upsert: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { id: "completion-1" },
								error: null,
							}),
						}),
					}),
				})
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { category: "Communication" },
								error: null,
							}),
						}),
					}),
				});

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

			// Should still succeed even if analytics fails
			expect(response.status).toBe(200);
		});
	});
});
