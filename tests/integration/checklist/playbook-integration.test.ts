/**
 * Integration tests for Playbook export with checklist integration
 * Tests T044 and T045: Integration of checklist export into main Playbook export
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/playbook/export/route";

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

describe("Integration: Playbook Export with Checklist (T044, T045)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-123" } },
			error: null,
		});
	});

	it("T044: should integrate checklist export into Playbook export", async () => {
		const mockEvaluation = {
			id: "eval-123",
			user_id: "user-123",
			score: 85,
			feedback: "Great improvement in communication skills!",
			what_changed: "Add specific metrics to support claims",
			practice_rule: "Keep answers under 2 minutes for maximum impact",
			delivery_note: "Excellent delivery",
			response_text: "Test response",
			response_type: "text",
			created_at: "2025-01-27T09:00:00Z",
			question_id: "q-123",
		};

		const mockCompletions = [
			{
				id: "completion-1",
				template: {
					category: "Communication",
					item_text: "Speak clearly and concisely",
					display_order: 1,
				},
			},
			{
				id: "completion-2",
				template: {
					category: "Problem Solving",
					item_text: "Use specific examples",
					display_order: 1,
				},
			},
		];

		// Mock evaluation fetch
		mockFrom
			.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvaluation,
							error: null,
						}),
					}),
				}),
			})
			// Mock checklist completions fetch
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
			});

		const request = new NextRequest(
			"http://localhost/api/playbook/export?evaluationId=eval-123",
		);

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.data.evaluationId).toBe("eval-123");
		expect(json.data.includesChecklist).toBe(true);
		expect(json.data.totalCompleted).toBe(2);
		expect(json.data.categoriesCount).toBe(2);

		// Verify Playbook document includes evaluation data
		expect(json.data.formattedText).toContain("# Practice Playbook");
		expect(json.data.formattedText).toContain("## Evaluation Results");
		expect(json.data.formattedText).toContain("**Overall Score:** 85%");
		expect(json.data.formattedText).toContain("Great improvement");

		// Verify Playbook document includes checklist data (T044)
		expect(json.data.formattedText).toContain("## Coaching Checklist");
		expect(json.data.formattedText).toContain("Communication");
		expect(json.data.formattedText).toContain("Problem Solving");
		expect(json.data.formattedText).toContain("Speak clearly and concisely");
		expect(json.data.formattedText).toContain("Use specific examples");
	});

	it("T045: should format checklist items correctly in Playbook document", async () => {
		const mockEvaluation = {
			id: "eval-123",
			user_id: "user-123",
			score: 75,
			feedback: "Good effort",
			what_changed: "Practice more",
			practice_rule: "Keep practicing",
			delivery_note: null,
			response_text: "Test",
			response_type: "text",
			created_at: "2025-01-27T09:00:00Z",
			question_id: "q-123",
		};

		const mockCompletions = [
			{
				id: "completion-1",
				template: {
					category: "Communication",
					item_text: "Item 1",
					display_order: 1,
				},
			},
			{
				id: "completion-2",
				template: {
					category: "Communication",
					item_text: "Item 2",
					display_order: 2,
				},
			},
		];

		mockFrom
			.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvaluation,
							error: null,
						}),
					}),
				}),
			})
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
			});

		const request = new NextRequest(
			"http://localhost/api/playbook/export?evaluationId=eval-123",
		);

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(200);

		// Verify checklist formatting (T045)
		const text = json.data.formattedText;

		// Should have checklist section header
		expect(text).toContain("## Coaching Checklist");

		// Should have category header
		expect(text).toContain("### Communication");

		// Should have checklist items with checkmark
		expect(text).toContain("- ✅ Item 1");
		expect(text).toContain("- ✅ Item 2");

		// Items should be in correct order
		const item1Index = text.indexOf("Item 1");
		const item2Index = text.indexOf("Item 2");
		expect(item1Index).toBeLessThan(item2Index);

		// Should show completion count
		expect(text).toContain("2 coaching items");
		expect(text).toContain("1 categories");
	});

	it("should handle empty checklist in Playbook export", async () => {
		const mockEvaluation = {
			id: "eval-123",
			user_id: "user-123",
			score: 80,
			feedback: "Good",
			what_changed: "Keep practicing",
			practice_rule: "Practice more",
			delivery_note: null,
			response_text: "Test",
			response_type: "text",
			created_at: "2025-01-27T09:00:00Z",
			question_id: "q-123",
		};

		mockFrom
			.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvaluation,
							error: null,
						}),
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
			});

		const request = new NextRequest(
			"http://localhost/api/playbook/export?evaluationId=eval-123",
		);

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.data.includesChecklist).toBe(false);
		expect(json.data.totalCompleted).toBe(0);

		// Should still include checklist section with empty message
		expect(json.data.formattedText).toContain("## Coaching Checklist");
		expect(json.data.formattedText).toContain(
			"No checklist items completed yet.",
		);
	});

	it("should return 401 when user is not authenticated", async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const request = new NextRequest(
			"http://localhost/api/playbook/export?evaluationId=eval-123",
		);

		const response = await GET(request);

		expect(response.status).toBe(401);
	});

	it("should return 400 when evaluationId is missing", async () => {
		const request = new NextRequest("http://localhost/api/playbook/export");

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(400);
		expect(json.error).toBe("Evaluation ID is required");
	});

	it("should return 404 when evaluation not found", async () => {
		mockFrom.mockReturnValueOnce({
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
			"http://localhost/api/playbook/export?evaluationId=non-existent",
		);

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(404);
		expect(json.error).toBe("Evaluation not found");
	});

	it("should return 403 when user does not own evaluation", async () => {
		const mockEvaluation = {
			id: "eval-123",
			user_id: "other-user",
			score: 85,
			feedback: "Test",
			what_changed: "Test",
			practice_rule: "Test",
			delivery_note: null,
			response_text: "Test",
			response_type: "text",
			created_at: "2025-01-27T09:00:00Z",
			question_id: "q-123",
		};

		mockFrom.mockReturnValueOnce({
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
			"http://localhost/api/playbook/export?evaluationId=eval-123",
		);

		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(403);
		expect(json.error).toContain("Forbidden");
	});
});
