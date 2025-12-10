/**
 * Unit tests for /api/checklist route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/checklist/route";

// Mock dependencies
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
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

vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
}));

describe("/api/checklist", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-123" } },
			error: null,
		});
		mockTrack.mockResolvedValue(undefined);
	});

	describe("GET", () => {
		it("should return checklist items for category and evaluation", async () => {
			const mockTemplates = [
				{
					id: "template-1",
					category: "Communication",
					item_text: "Item 1",
					display_order: 1,
					is_active: true,
				},
			];

			const mockCompletions = [{ template_id: "template-1" }];

			mockFrom
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: [{ category: "Communication" }],
							error: null,
						}),
					}),
				})
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								order: vi.fn().mockResolvedValue({
									data: mockTemplates,
									error: null,
								}),
							}),
						}),
					}),
				})
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({
								data: mockCompletions,
								error: null,
							}),
						}),
					}),
				});

			const request = new NextRequest(
				"http://localhost/api/checklist?category=Communication&evaluationId=eval-123",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.items).toHaveLength(1);
			expect(json.data.items[0].is_completed).toBe(true);
		});

		it("should return 401 when user is not authenticated", async () => {
			mockGetUser.mockResolvedValue({
				data: { user: null },
				error: { message: "Not authenticated" },
			});

			const request = new NextRequest(
				"http://localhost/api/checklist?category=Communication&evaluationId=eval-123",
			);

			const response = await GET(request);

			expect(response.status).toBe(401);
		});

		it("should return 400 when category is missing", async () => {
			const request = new NextRequest(
				"http://localhost/api/checklist?evaluationId=eval-123",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error).toBe("Category is required");
		});

		it("should return 400 when evaluationId is missing", async () => {
			const request = new NextRequest(
				"http://localhost/api/checklist?category=Communication",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error).toBe("Evaluation ID is required");
		});

		it("should handle category matching with Levenshtein distance", async () => {
			mockFrom
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: [{ category: "Communication" }],
							error: null,
						}),
					}),
				})
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								order: vi.fn().mockResolvedValue({
									data: [],
									error: null,
								}),
							}),
						}),
					}),
				})
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({
								data: [],
								error: null,
							}),
						}),
					}),
				});

			// Category with typo
			const request = new NextRequest(
				"http://localhost/api/checklist?category=Comunication&evaluationId=eval-123",
			);

			const response = await GET(request);

			expect(response.status).toBe(200);
		});

		it("should return 500 on database error", async () => {
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "Database error" },
					}),
				}),
			});

			const request = new NextRequest(
				"http://localhost/api/checklist?category=Communication&evaluationId=eval-123",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(500);
			expect(json.error).toBe("Failed to fetch checklist");
		});

		it("should handle analytics failure gracefully", async () => {
			mockTrack.mockRejectedValue(new Error("Analytics error"));

			mockFrom
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: [{ category: "Communication" }],
							error: null,
						}),
					}),
				})
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								order: vi.fn().mockResolvedValue({
									data: [],
									error: null,
								}),
							}),
						}),
					}),
				})
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({
								data: [],
								error: null,
							}),
						}),
					}),
				});

			const request = new NextRequest(
				"http://localhost/api/checklist?category=Communication&evaluationId=eval-123",
			);

			const response = await GET(request);

			// Should still succeed even if analytics fails
			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.data.items).toBeDefined();
		});
	});
});
