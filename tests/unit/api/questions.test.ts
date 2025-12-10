/**
 * Unit tests for /api/questions route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/questions/route";

// Mock Supabase client
const mockRpc = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/infrastructure/supabase/server", () => ({
	createClient: vi.fn(() => ({
		auth: {
			getUser: () => mockGetUser(),
		},
		rpc: mockRpc,
	})),
}));

describe("/api/questions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-123" } },
			error: null,
		});
	});

	describe("GET", () => {
		it("should return questions for valid specialty", async () => {
			const mockQuestions = [
				{
					question_id: "q1",
					question_text: "Test question",
					question_type: "clinical",
					question_specialty: "pediatrics",
					evaluation_id: "eval-1",
					evaluation_title: "Test Evaluation",
				},
			];

			mockRpc.mockResolvedValue({
				data: mockQuestions,
				error: null,
			});

			const request = new NextRequest(
				"http://localhost/api/questions?specialty=pediatrics&limit=10",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.questions).toHaveLength(1);
			expect(json.data.questions[0].id).toBe("q1");
			expect(json.data.matchRatio).toBe(100);
			expect(mockRpc).toHaveBeenCalledWith("get_questions_by_specialty", {
				target_specialty: "pediatrics",
				limit_count: 10,
			});
		});

		it("should return 401 when user is not authenticated", async () => {
			mockGetUser.mockResolvedValue({
				data: { user: null },
				error: { message: "Not authenticated" },
			});

			const request = new NextRequest(
				"http://localhost/api/questions?specialty=pediatrics",
			);

			const response = await GET(request);

			expect(response.status).toBe(401);
		});

		it("should return 400 when specialty is missing", async () => {
			const request = new NextRequest("http://localhost/api/questions");

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error).toBe("Specialty parameter is required");
			expect(json.code).toBe("MISSING_SPECIALTY");
		});

		it("should use default limit of 10", async () => {
			mockRpc.mockResolvedValue({
				data: [],
				error: null,
			});

			const request = new NextRequest(
				"http://localhost/api/questions?specialty=cardiology",
			);

			await GET(request);

			expect(mockRpc).toHaveBeenCalledWith("get_questions_by_specialty", {
				target_specialty: "cardiology",
				limit_count: 10,
			});
		});

		it("should return 400 for invalid limit", async () => {
			const request = new NextRequest(
				"http://localhost/api/questions?specialty=cardiology&limit=0",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error).toContain("Limit must be between 1 and 100");
		});

		it("should return 400 for limit exceeding 100", async () => {
			const request = new NextRequest(
				"http://localhost/api/questions?specialty=cardiology&limit=101",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.code).toBe("INVALID_LIMIT");
		});

		it("should return 400 for NaN limit", async () => {
			const request = new NextRequest(
				"http://localhost/api/questions?specialty=cardiology&limit=abc",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(400);
		});

		it("should return empty array when no questions found", async () => {
			mockRpc.mockResolvedValue({
				data: [],
				error: null,
			});

			const request = new NextRequest(
				"http://localhost/api/questions?specialty=nonexistent",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.questions).toEqual([]);
			expect(json.data.matchRatio).toBe(0);
			expect(json.data.totalCount).toBe(0);
		});

		it("should calculate match ratio correctly", async () => {
			const mockQuestions = [
				{
					question_id: "q1",
					question_text: "Question 1",
					question_type: "clinical",
					question_specialty: "pediatrics",
					evaluation_id: "eval-1",
					evaluation_title: "Eval 1",
				},
				{
					question_id: "q2",
					question_text: "Question 2",
					question_type: "clinical",
					question_specialty: "cardiology",
					evaluation_id: "eval-2",
					evaluation_title: "Eval 2",
				},
				{
					question_id: "q3",
					question_text: "Question 3",
					question_type: "clinical",
					question_specialty: "pediatrics",
					evaluation_id: "eval-3",
					evaluation_title: "Eval 3",
				},
			];

			mockRpc.mockResolvedValue({
				data: mockQuestions,
				error: null,
			});

			const request = new NextRequest(
				"http://localhost/api/questions?specialty=pediatrics&limit=10",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.matchRatio).toBe(67); // 2 out of 3 match
		});

		it("should format questions correctly", async () => {
			const mockQuestions = [
				{
					question_id: "q1",
					question_text: "Test question",
					question_type: "clinical",
					question_specialty: "pediatrics",
					evaluation_id: "eval-1",
					evaluation_title: "Test Evaluation",
				},
			];

			mockRpc.mockResolvedValue({
				data: mockQuestions,
				error: null,
			});

			const request = new NextRequest(
				"http://localhost/api/questions?specialty=pediatrics",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(json.data.questions[0]).toEqual({
				id: "q1",
				text: "Test question",
				type: "clinical",
				specialty: "pediatrics",
				evaluation: {
					id: "eval-1",
					title: "Test Evaluation",
				},
			});
		});

		it("should return 500 on database error", async () => {
			mockRpc.mockResolvedValue({
				data: null,
				error: { message: "Database connection failed" },
			});

			const request = new NextRequest(
				"http://localhost/api/questions?specialty=pediatrics",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(500);
			expect(json.error).toBe("Failed to fetch questions");
			expect(json.code).toBe("INTERNAL_SERVER_ERROR");
		});

		it("should return 500 on unexpected error", async () => {
			mockRpc.mockImplementation(() => {
				throw new Error("Unexpected error");
			});

			const request = new NextRequest(
				"http://localhost/api/questions?specialty=pediatrics",
			);

			const response = await GET(request);
			const json = await response.json();

			expect(response.status).toBe(500);
			expect(json.code).toBe("INTERNAL_SERVER_ERROR");
		});
	});
});
