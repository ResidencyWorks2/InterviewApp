/**
 * Unit tests for /api/diagnostics route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/diagnostics/route";

// Mock diagnostic service
const mockGetDiagnosticInfo = vi.fn();
const mockGenerateDiagnosticReport = vi.fn();
const mockRecordError = vi.fn();

vi.mock("@/infrastructure/diagnostics/diagnostic-service", () => ({
	diagnosticService: {
		getDiagnosticInfo: () => mockGetDiagnosticInfo(),
		generateDiagnosticReport: () => mockGenerateDiagnosticReport(),
		recordError: (error: Error, component: string, severity: string) =>
			mockRecordError(error, component, severity),
	},
}));

// Mock logger
vi.mock("@/infrastructure/logging/logger", () => ({
	logger: {
		error: vi.fn(),
		info: vi.fn(),
	},
}));

describe("/api/diagnostics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET", () => {
		it("should return JSON diagnostic info by default", async () => {
			const mockInfo = {
				system: "healthy",
				timestamp: new Date().toISOString(),
			};
			mockGetDiagnosticInfo.mockResolvedValue(mockInfo);

			const request = new NextRequest("http://localhost/api/diagnostics", {
				method: "GET",
			});

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toEqual(mockInfo);
			expect(mockGetDiagnosticInfo).toHaveBeenCalledOnce();
		});

		it("should return markdown report when format=report", async () => {
			const mockReport = "# Diagnostic Report\n\nSystem is healthy";
			mockGenerateDiagnosticReport.mockResolvedValue(mockReport);

			const request = new NextRequest(
				"http://localhost/api/diagnostics?format=report",
				{ method: "GET" },
			);

			const response = await GET(request);
			const text = await response.text();

			expect(response.status).toBe(200);
			expect(text).toBe(mockReport);
			expect(response.headers.get("Content-Type")).toBe("text/markdown");
			expect(mockGenerateDiagnosticReport).toHaveBeenCalledOnce();
		});

		it("should return markdown report when report=true", async () => {
			const mockReport = "# Diagnostic Report\n\nSystem is healthy";
			mockGenerateDiagnosticReport.mockResolvedValue(mockReport);

			const request = new NextRequest(
				"http://localhost/api/diagnostics?report=true",
				{ method: "GET" },
			);

			const response = await GET(request);
			const text = await response.text();

			expect(response.status).toBe(200);
			expect(text).toBe(mockReport);
			expect(mockGenerateDiagnosticReport).toHaveBeenCalledOnce();
		});

		it("should handle errors", async () => {
			mockGetDiagnosticInfo.mockRejectedValue(new Error("Service error"));

			const request = new NextRequest("http://localhost/api/diagnostics", {
				method: "GET",
			});

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBeDefined();
		});
	});

	describe("POST", () => {
		it("should record error successfully", async () => {
			const requestBody = {
				error: { message: "Test error", stack: "Error stack" },
				component: "test-component",
				severity: "high",
			};

			const request = new NextRequest("http://localhost/api/diagnostics", {
				method: "POST",
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(mockRecordError).toHaveBeenCalledWith(
				expect.any(Error),
				"test-component",
				"high",
			);
		});

		it("should use default severity when not provided", async () => {
			const requestBody = {
				error: { message: "Test error" },
				component: "test-component",
			};

			const request = new NextRequest("http://localhost/api/diagnostics", {
				method: "POST",
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(mockRecordError).toHaveBeenCalledWith(
				expect.any(Error),
				"test-component",
				"medium",
			);
		});

		it("should handle string error format", async () => {
			const requestBody = {
				error: "String error message",
				component: "test-component",
			};

			const request = new NextRequest("http://localhost/api/diagnostics", {
				method: "POST",
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(mockRecordError).toHaveBeenCalled();
		});

		it("should return error for missing error field", async () => {
			const requestBody = {
				component: "test-component",
			};

			const request = new NextRequest("http://localhost/api/diagnostics", {
				method: "POST",
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("Missing required fields");
		});

		it("should return error for missing component field", async () => {
			const requestBody = {
				error: { message: "Test error" },
			};

			const request = new NextRequest("http://localhost/api/diagnostics", {
				method: "POST",
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("Missing required fields");
		});

		it("should handle errors", async () => {
			mockRecordError.mockImplementation(() => {
				throw new Error("Record failed");
			});

			const requestBody = {
				error: { message: "Test error" },
				component: "test-component",
			};

			const request = new NextRequest("http://localhost/api/diagnostics", {
				method: "POST",
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBeDefined();
		});
	});
});
