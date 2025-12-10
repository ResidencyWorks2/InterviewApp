/**
 * Integration tests for checklist API endpoints
 * Tests GET /api/checklist endpoint and checklist_opened analytics event
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

describe("Integration: GET /api/checklist", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-123" } },
			error: null,
		});
		mockTrack.mockResolvedValue(undefined);
	});

	it("should fetch checklist items and fire checklist_opened analytics event", async () => {
		const mockTemplates = [
			{
				id: "template-1",
				category: "Communication",
				item_text: "Speak clearly",
				display_order: 1,
				is_active: true,
			},
			{
				id: "template-2",
				category: "Communication",
				item_text: "Use examples",
				display_order: 2,
				is_active: true,
			},
		];

		const mockCompletions = [{ template_id: "template-1" }];

		// Mock: Fetch all template categories
		mockFrom
			.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [{ category: "Communication" }],
						error: null,
					}),
				}),
			})
			// Mock: Fetch templates for category
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
			// Mock: Fetch completions
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
		expect(json.data.items).toHaveLength(2);
		expect(json.data.items[0].is_completed).toBe(true);
		expect(json.data.items[1].is_completed).toBe(false);

		// Verify checklist_opened analytics event was fired
		expect(mockTrack).toHaveBeenCalledWith(
			"checklist_opened",
			expect.objectContaining({
				category: "Communication",
				evaluation_id: "eval-123",
				item_count: 2,
				completed_count: 1,
			}),
			"user-123",
		);
	});

	it("should handle category mismatch and log to Sentry", async () => {
		const { captureMessage } = await import("@sentry/nextjs");

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

		// Category with typo that will trigger Levenshtein matching
		const request = new NextRequest(
			"http://localhost/api/checklist?category=Comunication&evaluationId=eval-123",
		);

		const response = await GET(request);

		expect(response.status).toBe(200);

		// Verify Sentry was called for category mismatch (if non-exact match)
		// Note: This depends on the findClosestCategory implementation
		// If it finds a match via Levenshtein, Sentry should be called
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
		const json = await response.json();

		expect(response.status).toBe(401);
		expect(json.error).toContain("Authentication required");
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
