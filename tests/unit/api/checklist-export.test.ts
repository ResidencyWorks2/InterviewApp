/**
 * Unit tests for /api/checklist/export route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/checklist/export/route";

// Mock Supabase client
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

describe("/api/checklist/export", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-123" } },
			error: null,
		});
	});

	describe("GET", () => {
		it("should export checklist items as markdown", async () => {
			const mockCompletions = [
				{
					id: "1",
					template: {
						category: "Communication",
						item_text: "Item 1",
						display_order: 1,
					},
				},
			];

			const mockEvaluation = {
				delivery_note: "Test note",
				score: 85,
				created_at: new Date().toISOString(),
			};

			// Mock the first query (completions)
			const mockEq1 = vi.fn();
			const mockEq2 = vi.fn();
			const mockOrder = vi.fn();

			mockFrom
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: mockEq2.mockReturnValue({
								order: mockOrder.mockResolvedValue({
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
			expect(json.data.formattedText).toBeDefined();
			expect(json.data.formattedText).toContain("Coaching Checklist");
		});

		it("should export checklist items with empty completions", async () => {
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

		it("should handle database errors", async () => {
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
	});
});
