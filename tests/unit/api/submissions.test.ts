/**
 * Unit tests for /api/submissions route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, POST } from "@/app/api/submissions/route";

// Mock Supabase client
const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/infrastructure/supabase/server", () => ({
	createClient: vi.fn(() => ({
		auth: {
			getUser: () => mockGetUser(),
		},
		from: vi.fn(() => ({
			upsert: mockUpsert,
			select: mockSelect,
			update: mockUpdate,
			eq: mockEq,
			single: mockSingle,
		})),
	})),
}));

describe("/api/submissions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-123" } },
			error: null,
		});
		mockSingle.mockResolvedValue({
			data: null,
			error: null,
		});
		mockEq.mockReturnThis();
		mockSelect.mockReturnThis();
	});

	describe("POST", () => {
		it("should create a new submission", async () => {
			const mockSubmission = {
				id: "sub-1",
				user_id: "user-123",
				question_id: "q-1",
				drill_id: "drill-1",
				response_type: "text",
			};

			mockUpsert.mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockSubmission,
						error: null,
					}),
				}),
			});

			const request = new NextRequest("http://localhost/api/submissions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					questionId: "q-1",
					drillId: "drill-1",
					responseType: "text",
					responseText: "Test response",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.submission).toEqual(mockSubmission);
		});

		it("should return 401 when user is not authenticated", async () => {
			mockGetUser.mockResolvedValue({
				data: { user: null },
				error: { message: "Not authenticated" },
			});

			const request = new NextRequest("http://localhost/api/submissions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					questionId: "q-1",
					drillId: "drill-1",
					responseType: "text",
				}),
			});

			const response = await POST(request);

			expect(response.status).toBe(401);
		});

		it("should return 400 when required fields are missing", async () => {
			const request = new NextRequest("http://localhost/api/submissions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					questionId: "q-1",
					// Missing drillId and responseType
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error).toContain("Missing required fields");
		});

		it("should return 500 on database error", async () => {
			mockUpsert.mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "Database error" },
					}),
				}),
			});

			const request = new NextRequest("http://localhost/api/submissions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					questionId: "q-1",
					drillId: "drill-1",
					responseType: "text",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(500);
			expect(json.error).toBe("Failed to save submission");
			expect(json.code).toBe("DATABASE_ERROR");
		});
	});

	describe("GET", () => {
		it("should fetch submission for question and drill", async () => {
			const mockSubmission = {
				id: "sub-1",
				question_id: "q-1",
				drill_id: "drill-1",
			};

			mockSelect.mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: mockSubmission,
								error: null,
							}),
						}),
					}),
				}),
			});

			const request = new NextRequest(
				"http://localhost/api/submissions?questionId=q-1&drillId=drill-1",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.submission).toEqual(mockSubmission);
		});

		it("should return 400 when questionId or drillId missing", async () => {
			const request = new NextRequest(
				"http://localhost/api/submissions?questionId=q-1",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error).toContain("Missing required parameters");
		});

		it("should return null submission when not found", async () => {
			mockSelect.mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: { code: "PGRST116" }, // Not found
							}),
						}),
					}),
				}),
			});

			const request = new NextRequest(
				"http://localhost/api/submissions?questionId=q-1&drillId=drill-1",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.submission).toBeNull();
		});

		it("should return 401 when user is not authenticated", async () => {
			mockGetUser.mockResolvedValue({
				data: { user: null },
				error: { message: "Not authenticated" },
			});

			const request = new NextRequest(
				"http://localhost/api/submissions?questionId=q-1&drillId=drill-1",
			);

			const response = await GET(request);

			expect(response.status).toBe(401);
		});
	});

	describe("PATCH", () => {
		it("should update submission evaluation status", async () => {
			const mockSubmission = {
				id: "sub-1",
				evaluation_status: "completed",
			};

			mockUpdate.mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: mockSubmission,
								error: null,
							}),
						}),
					}),
				}),
			});

			const request = new NextRequest("http://localhost/api/submissions", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					submissionId: "sub-1",
					evaluation_status: "completed",
				}),
			});

			const response = await PATCH(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.submission).toEqual(mockSubmission);
		});

		it("should return 400 when submissionId missing", async () => {
			const request = new NextRequest("http://localhost/api/submissions", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					evaluation_status: "completed",
				}),
			});

			const response = await PATCH(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error).toContain("Missing required field: submissionId");
		});

		it("should return 401 when user is not authenticated", async () => {
			mockGetUser.mockResolvedValue({
				data: { user: null },
				error: { message: "Not authenticated" },
			});

			const request = new NextRequest("http://localhost/api/submissions", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					submissionId: "sub-1",
					evaluation_status: "completed",
				}),
			});

			const response = await PATCH(request);

			expect(response.status).toBe(401);
		});
	});
});
