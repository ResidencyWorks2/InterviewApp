/**
 * Unit tests for /api/text-submit route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/text-submit/route";

// Mock dependencies
vi.mock("@/features/auth/application/entitlements/upload-permissions", () => ({
	validateUploadPermission: vi.fn(),
}));

vi.mock("@/features/booking/application/upload/errors", () => ({
	captureUploadError: vi.fn(),
}));

import { validateUploadPermission } from "@/features/auth/application/entitlements/upload-permissions";
import { captureUploadError } from "@/features/booking/application/upload/errors";

vi.mock("@/shared/security/phi-scrubber", () => ({
	PhiScrubber: {
		scrubUserInput: vi.fn((text: string) =>
			text.replace(/test@example\.com/g, "[EMAIL_REDACTED]"),
		),
	},
}));

describe("/api/text-submit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(validateUploadPermission).mockResolvedValue(undefined);
	});

	describe("POST", () => {
		it("should successfully submit valid text", async () => {
			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: "This is a valid text submission with enough characters.",
					sessionId: "session-123",
					questionId: "question-123",
					userId: "user-123",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.success).toBe(true);
			expect(json.responseId).toBeDefined();
			expect(json.textLength).toBeGreaterThan(0);
			expect(json.submittedAt).toBeDefined();
			expect(vi.mocked(validateUploadPermission)).toHaveBeenCalledWith(
				"user-123",
			);
		});

		it("should return 400 when text is missing", async () => {
			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionId: "session-123",
					questionId: "question-123",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.success).toBe(false);
			expect(json.error.code).toBe("INVALID_INPUT");
		});

		it("should return 400 when text is not a string", async () => {
			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: 12345,
					sessionId: "session-123",
					questionId: "question-123",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error.code).toBe("INVALID_INPUT");
		});

		it("should return 400 when text is too short", async () => {
			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: "Short",
					sessionId: "session-123",
					questionId: "question-123",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error.code).toBe("VALIDATION_ERROR");
			expect(json.error.message).toContain("10 and 5000 characters");
		});

		it("should return 400 when text is too long", async () => {
			const longText = "a".repeat(5001);
			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: longText,
					sessionId: "session-123",
					questionId: "question-123",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error.code).toBe("VALIDATION_ERROR");
		});

		it("should return 400 when sessionId is missing", async () => {
			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: "Valid text with enough characters here",
					questionId: "question-123",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error.code).toBe("VALIDATION_ERROR");
			expect(json.error.message).toContain("Session ID and Question ID");
		});

		it("should return 400 when questionId is missing", async () => {
			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: "Valid text with enough characters here",
					sessionId: "session-123",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(400);
			expect(json.error.code).toBe("VALIDATION_ERROR");
		});

		it("should return 403 when user permission validation fails", async () => {
			vi.mocked(validateUploadPermission).mockRejectedValue(
				new Error("Permission denied"),
			);

			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: "Valid text with enough characters here",
					sessionId: "session-123",
					questionId: "question-123",
					userId: "user-123",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(403);
			expect(json.success).toBe(false);
			expect(json.error.code).toBe("PERMISSION_DENIED");
		});

		it("should work without userId", async () => {
			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: "Valid text with enough characters here",
					sessionId: "session-123",
					questionId: "question-123",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.success).toBe(true);
			expect(vi.mocked(validateUploadPermission)).not.toHaveBeenCalled();
		});

		it("should scrub PHI from text", async () => {
			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: "Contact me at test@example.com for more info",
					sessionId: "session-123",
					questionId: "question-123",
				}),
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.textLength).toBeGreaterThan(0);
		});

		it("should return 500 on unexpected error", async () => {
			const request = new NextRequest("http://localhost/api/text-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "invalid json",
			});

			const response = await POST(request);
			const json = await response.json();

			expect(response.status).toBe(500);
			expect(json.success).toBe(false);
			expect(json.error.code).toBe("INTERNAL_ERROR");
			expect(vi.mocked(captureUploadError)).toHaveBeenCalled();
		});
	});
});
