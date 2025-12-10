/**
 * Integration tests for checklist export endpoint
 * Tests GET /api/checklist/export endpoint with various scenarios
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/checklist/export/route";

// Mock dependencies
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/infrastructure/supabase/server", () => ({
	createClient: vi.fn(() => ({
		auth: {
			getUser: () => mockGetUser(),
		},
		from: mockFrom,
	})),
}));

describe("Integration: GET /api/checklist/export", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-123" } },
			error: null,
		});
	});

	it("should export completed checklist items grouped by category", async () => {
		const mockCompletions = [
			{
				id: "completion-1",
				user_id: "user-123",
				evaluation_id: "eval-123",
				template_id: "template-1",
				completed_at: "2025-01-27T10:00:00Z",
				template: {
					category: "Communication",
					item_text: "Speak clearly and concisely",
					display_order: 1,
				},
			},
			{
				id: "completion-2",
				user_id: "user-123",
				evaluation_id: "eval-123",
				template_id: "template-2",
				completed_at: "2025-01-27T10:05:00Z",
				template: {
					category: "Communication",
					item_text: "Use specific examples",
					display_order: 2,
				},
			},
			{
				id: "completion-3",
				user_id: "user-123",
				evaluation_id: "eval-123",
				template_id: "template-3",
				completed_at: "2025-01-27T10:10:00Z",
				template: {
					category: "Problem Solving",
					item_text: "Break down complex problems",
					display_order: 1,
				},
			},
		];

		const mockEvaluation = {
			delivery_note: "Great improvement in communication skills!",
			score: 85,
			created_at: "2025-01-27T09:00:00Z",
		};

		mockFrom
			.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: mockCompletions,
								error: null,
							}),
						}),
					}),
				}),
			})
			.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvaluation,
							error: null,
						}),
					}),
				}),
			});

		const request = new NextRequest(
			"http://localhost/api/checklist/export?evaluationId=eval-123",
		);

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.data.evaluationId).toBe("eval-123");
		expect(json.data.totalCompleted).toBe(3);
		expect(json.data.categoriesCount).toBe(2);
		expect(json.data.completions).toHaveProperty("Communication");
		expect(json.data.completions).toHaveProperty("Problem Solving");
		expect(json.data.completions.Communication).toHaveLength(2);
		expect(json.data.completions["Problem Solving"]).toHaveLength(1);
		expect(json.data.formattedText).toContain("Coaching Checklist");
		expect(json.data.formattedText).toContain("Communication");
		expect(json.data.formattedText).toContain("Problem Solving");
		expect(json.data.formattedText).toContain("Speak clearly and concisely");
		expect(json.data.formattedText).toContain("Great improvement");
	});

	it("should handle empty completions with appropriate message", async () => {
		mockFrom
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
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { code: "PGRST116" }, // Not found
						}),
					}),
				}),
			});

		const request = new NextRequest(
			"http://localhost/api/checklist/export?evaluationId=eval-123",
		);

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.data.totalCompleted).toBe(0);
		expect(json.data.categoriesCount).toBe(0);
		expect(json.data.formattedText).toContain(
			"No checklist items completed yet.",
		);
	});

	it("should include evaluation score and delivery note in formatted text", async () => {
		const mockCompletions = [
			{
				id: "completion-1",
				template: {
					category: "Communication",
					item_text: "Item 1",
					display_order: 1,
				},
			},
		];

		const mockEvaluation = {
			delivery_note: "Keep practicing!",
			score: 75,
			created_at: "2025-01-27T09:00:00Z",
		};

		mockFrom
			.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: mockCompletions,
								error: null,
							}),
						}),
					}),
				}),
			})
			.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvaluation,
							error: null,
						}),
					}),
				}),
			});

		const request = new NextRequest(
			"http://localhost/api/checklist/export?evaluationId=eval-123",
		);

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.data.formattedText).toContain("**Score:**");
		expect(json.data.formattedText).toContain("75%");
		expect(json.data.formattedText).toContain("Keep practicing!");
		expect(json.data.deliveryNote).toBe("Keep practicing!");
	});

	it("should return 401 when user is not authenticated", async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const request = new NextRequest(
			"http://localhost/api/checklist/export?evaluationId=eval-123",
		);

		const response = await GET(request);

		expect(response.status).toBe(401);
	});

	it("should return 400 when evaluationId is missing", async () => {
		const request = new NextRequest("http://localhost/api/checklist/export");

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(400);
		expect(json.error).toBe("Evaluation ID is required");
	});

	it("should handle database errors gracefully", async () => {
		mockFrom.mockReturnValueOnce({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						order: vi.fn().mockResolvedValue({
							data: null,
							error: { message: "Database error" },
						}),
					}),
				}),
			}),
		});

		const request = new NextRequest(
			"http://localhost/api/checklist/export?evaluationId=eval-123",
		);

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(500);
		expect(json.error).toBe("Failed to export checklist");
	});

	it("should sort items within categories by display_order", async () => {
		const mockCompletions = [
			{
				id: "completion-2",
				template: {
					category: "Communication",
					item_text: "Second item",
					display_order: 2,
				},
			},
			{
				id: "completion-1",
				template: {
					category: "Communication",
					item_text: "First item",
					display_order: 1,
				},
			},
		];

		mockFrom
			.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: mockCompletions,
								error: null,
							}),
						}),
					}),
				}),
			})
			.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { code: "PGRST116" },
						}),
					}),
				}),
			});

		const request = new NextRequest(
			"http://localhost/api/checklist/export?evaluationId=eval-123",
		);

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(200);
		const communicationItems = json.data.completions.Communication;
		expect(communicationItems[0].display_order).toBe(1);
		expect(communicationItems[1].display_order).toBe(2);
		// Verify formatted text has items in correct order
		const firstIndex = json.data.formattedText.indexOf("First item");
		const secondIndex = json.data.formattedText.indexOf("Second item");
		expect(firstIndex).toBeLessThan(secondIndex);
	});
});
