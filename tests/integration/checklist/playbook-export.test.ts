/**
 * Integration tests for Playbook export including checklist data
 *
 * NOTE: Main Playbook export endpoint does not exist yet.
 * This test verifies that the checklist export endpoint is ready
 * for integration when the main Playbook export is implemented.
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

describe("Integration: Playbook Export with Checklist Data", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-123" } },
			error: null,
		});
	});

	it("should return formatted text ready for Playbook integration", async () => {
		const mockCompletions = [
			{
				id: "completion-1",
				template: {
					category: "Communication",
					item_text: "Speak clearly",
					display_order: 1,
				},
			},
		];

		const mockEvaluation = {
			delivery_note: "Test note",
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

		// Verify formatted text is markdown-compatible
		expect(json.data.formattedText).toContain("##");
		expect(json.data.formattedText).toContain("###");
		expect(json.data.formattedText).toContain("- ✅");

		// Verify structure is suitable for Playbook integration
		expect(json.data.formattedText).toBeDefined();
		expect(typeof json.data.formattedText).toBe("string");
		expect(json.data.formattedText.length).toBeGreaterThan(0);
	});

	it("should provide structured data for Playbook document assembly", async () => {
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
					category: "Problem Solving",
					item_text: "Item 2",
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

		// Verify response structure is suitable for integration
		expect(json.data).toHaveProperty("evaluationId");
		expect(json.data).toHaveProperty("completions");
		expect(json.data).toHaveProperty("formattedText");
		expect(json.data).toHaveProperty("totalCompleted");
		expect(json.data).toHaveProperty("categoriesCount");

		// Verify completions are grouped by category
		expect(typeof json.data.completions).toBe("object");
		expect(json.data.completions).toHaveProperty("Communication");
		expect(json.data.completions).toHaveProperty("Problem Solving");
	});

	it("should handle missing evaluation gracefully for Playbook integration", async () => {
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
		// Should still return valid structure even with no completions
		expect(json.data.formattedText).toBeDefined();
		expect(json.data.totalCompleted).toBe(0);
		expect(json.data.categoriesCount).toBe(0);
	});

	it("should format text with proper markdown structure for Playbook", async () => {
		const mockCompletions = [
			{
				id: "completion-1",
				template: {
					category: "Communication",
					item_text: "Test item with special chars: <>&\"'",
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

		// Verify markdown structure
		const text = json.data.formattedText;
		expect(text).toMatch(/^## /); // Starts with level 2 heading
		expect(text).toMatch(/### /); // Contains level 3 headings for categories
		expect(text).toMatch(/- ✅ /); // Contains checklist items

		// Verify special characters are handled (should be in text, not escaped)
		expect(text).toContain("Test item with special chars");
	});
});
