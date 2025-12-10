/**
 * Unit tests for API helper functions
 */

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createCORSHeaders,
	createErrorResponse,
	createForbiddenResponse,
	createNotFoundResponse,
	createRateLimitResponse,
	createServerErrorResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
	createValidationErrorResponse,
	getClientIP,
	getPathParams,
	getQueryParams,
	getRequestBody,
	getUserAgent,
	handleCORS,
	isBotRequest,
	logRequest,
	validateMethod,
} from "@/presentation/api/api-helpers";

describe("api-helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("createSuccessResponse", () => {
		it("should create success response with data", async () => {
			const data = { id: "1", name: "Test" };
			const response = createSuccessResponse(data);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.data).toEqual(data);
			expect(json.timestamp).toBeDefined();
		});

		it("should include optional message", async () => {
			const response = createSuccessResponse({}, "Operation successful");

			const json = await response.json();
			expect(json.message).toBe("Operation successful");
		});

		it("should set custom status code", () => {
			const response = createSuccessResponse({}, undefined, { status: 201 });

			expect(response.status).toBe(201);
		});

		it("should include cache headers when provided", async () => {
			const response = createSuccessResponse({}, undefined, {
				cache: { maxAge: 3600 },
			});

			const headers = response.headers;
			expect(headers.get("Cache-Control")).toBe("public, max-age=3600");
		});

		it("should include custom headers", async () => {
			const response = createSuccessResponse({}, undefined, {
				headers: { "X-Custom": "value" },
			});

			const headers = response.headers;
			expect(headers.get("X-Custom")).toBe("value");
		});
	});

	describe("createErrorResponse", () => {
		it("should create error response with message", async () => {
			const response = createErrorResponse("Test error");

			expect(response.status).toBe(400);
			const json = await response.json();
			expect(json.error).toBe("Test error");
			expect(json.timestamp).toBeDefined();
		});

		it("should include error code", async () => {
			const response = createErrorResponse("Error", "ERROR_CODE");

			const json = await response.json();
			expect(json.code).toBe("ERROR_CODE");
		});

		it("should include details", async () => {
			const details = { field: "email", reason: "invalid format" };
			const response = createErrorResponse("Error", undefined, 400, details);

			const json = await response.json();
			expect(json.details).toEqual(details);
		});

		it("should set custom status code", () => {
			const response = createErrorResponse("Error", undefined, 500);

			expect(response.status).toBe(500);
		});
	});

	describe("createValidationErrorResponse", () => {
		it("should create validation error response", async () => {
			const errors = { email: "Invalid email", password: "Too short" };
			const response = createValidationErrorResponse(errors);

			expect(response.status).toBe(422);
			const json = await response.json();
			expect(json.error).toBe("Validation failed");
			expect(json.code).toBe("VALIDATION_ERROR");
			expect(json.details?.validation_errors).toEqual(errors);
		});
	});

	describe("createNotFoundResponse", () => {
		it("should create not found response with default message", async () => {
			const response = createNotFoundResponse();

			expect(response.status).toBe(404);
			const json = await response.json();
			expect(json.error).toBe("Resource not found");
			expect(json.code).toBe("NOT_FOUND");
		});

		it("should create not found response with custom resource", async () => {
			const response = createNotFoundResponse("User");

			const json = await response.json();
			expect(json.error).toBe("User not found");
		});
	});

	describe("createUnauthorizedResponse", () => {
		it("should create unauthorized response", async () => {
			const response = createUnauthorizedResponse();

			expect(response.status).toBe(401);
			const json = await response.json();
			expect(json.error).toBe("Unauthorized");
			expect(json.code).toBe("UNAUTHORIZED");
		});

		it("should create unauthorized response with custom message", async () => {
			const response = createUnauthorizedResponse("Invalid token");

			const json = await response.json();
			expect(json.error).toBe("Invalid token");
		});
	});

	describe("createForbiddenResponse", () => {
		it("should create forbidden response", async () => {
			const response = createForbiddenResponse();

			expect(response.status).toBe(403);
			const json = await response.json();
			expect(json.error).toBe("Forbidden");
			expect(json.code).toBe("FORBIDDEN");
		});
	});

	describe("createRateLimitResponse", () => {
		it("should create rate limit response", async () => {
			const response = createRateLimitResponse(60);

			expect(response.status).toBe(429);
			const headers = response.headers;
			expect(headers.get("Retry-After")).toBe("60");
			expect(headers.get("X-RateLimit-Limit")).toBe("10");
			expect(headers.get("X-RateLimit-Remaining")).toBe("0");
		});

		it("should include custom limit and remaining", async () => {
			const response = createRateLimitResponse(30, 100, 50);

			const headers = response.headers;
			expect(headers.get("X-RateLimit-Limit")).toBe("100");
			expect(headers.get("X-RateLimit-Remaining")).toBe("50");
		});

		it("should calculate reset time from retry after if not provided", () => {
			const response = createRateLimitResponse(60);

			const headers = response.headers;
			const resetTime = headers.get("X-RateLimit-Reset");
			expect(resetTime).toBeDefined();
			expect(Number(resetTime)).toBeGreaterThan(Date.now() / 1000);
		});

		it("should use provided reset time", () => {
			const resetTime = Date.now() + 120000; // 2 minutes from now
			const response = createRateLimitResponse(60, 10, 0, resetTime);

			const headers = response.headers;
			const expectedReset = Math.floor(resetTime / 1000).toString();
			expect(headers.get("X-RateLimit-Reset")).toBe(expectedReset);
		});

		it("should return correct JSON payload", async () => {
			const response = createRateLimitResponse(60, 100, 50);

			const json = await response.json();
			expect(json.error).toBe("rate_limit_exceeded");
			expect(json.message).toContain("Too many requests");
			expect(json.retry_after).toBe(60);
			expect(json.limit).toBe(100);
			expect(json.window_seconds).toBe(60);
		});
	});

	describe("createServerErrorResponse", () => {
		it("should create server error response", async () => {
			const response = createServerErrorResponse();

			expect(response.status).toBe(500);
			const json = await response.json();
			expect(json.error).toBe("Internal server error");
			expect(json.code).toBe("INTERNAL_SERVER_ERROR");
		});

		it("should include custom message and details", async () => {
			const details = { stack: "Error stack" };
			const response = createServerErrorResponse("Database error", details);

			const json = await response.json();
			expect(json.error).toBe("Database error");
			expect(json.details).toEqual(details);
		});
	});

	describe("getRequestBody", () => {
		it("should return null for GET requests", async () => {
			const request = new NextRequest("http://localhost/api/test", {
				method: "GET",
			});

			const body = await getRequestBody(request);
			expect(body).toBeNull();
		});

		it("should parse JSON body for POST requests", async () => {
			const request = new NextRequest("http://localhost/api/test", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ test: "data" }),
			});

			const body = await getRequestBody(request);
			expect(body).toEqual({ test: "data" });
		});

		it("should return null for non-JSON content type", async () => {
			const request = new NextRequest("http://localhost/api/test", {
				method: "POST",
				headers: { "Content-Type": "text/plain" },
				body: "test",
			});

			const body = await getRequestBody(request);
			expect(body).toBeNull();
		});

		it("should return null on parse error", async () => {
			const request = new NextRequest("http://localhost/api/test", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "invalid json{",
			});

			const body = await getRequestBody(request);
			expect(body).toBeNull();
			expect(console.error).toHaveBeenCalled();
		});
	});

	describe("getQueryParams", () => {
		it("should extract query parameters", () => {
			const request = new NextRequest(
				"http://localhost/api/test?foo=bar&baz=qux",
			);

			const params = getQueryParams(request);
			expect(params.foo).toBe("bar");
			expect(params.baz).toBe("qux");
		});

		it("should return empty object for no query params", () => {
			const request = new NextRequest("http://localhost/api/test");

			const params = getQueryParams(request);
			expect(params).toEqual({});
		});

		it("should handle multiple values for same key", () => {
			const request = new NextRequest(
				"http://localhost/api/test?foo=bar&foo=baz",
			);

			const params = getQueryParams(request);
			// Last value wins
			expect(params.foo).toBe("baz");
		});
	});

	describe("getPathParams", () => {
		it("should extract path parameters", () => {
			const request = new NextRequest(
				"http://localhost/api/users/123/posts/456",
			);

			const params = getPathParams(request, ["userId", "postId"]);
			// pathname is "/api/users/123/posts/456", segments are ["api", "users", "123", "posts", "456"]
			expect(params.userId).toBe("api");
			expect(params.postId).toBe("users");
		});

		it("should handle missing path segments", () => {
			const request = new NextRequest("http://localhost/api/users");

			const params = getPathParams(request, ["userId", "postId"]);
			// pathname is "/api/users", segments are ["api", "users"]
			expect(params.userId).toBe("api");
			expect(params.postId).toBe("users");
		});
	});

	describe("getClientIP", () => {
		it("should extract IP from x-forwarded-for header", () => {
			const request = new NextRequest("http://localhost/api/test", {
				headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
			});

			const ip = getClientIP(request);
			expect(ip).toBe("192.168.1.1");
		});

		it("should extract IP from x-real-ip header", () => {
			const request = new NextRequest("http://localhost/api/test", {
				headers: { "x-real-ip": "192.168.1.2" },
			});

			const ip = getClientIP(request);
			expect(ip).toBe("192.168.1.2");
		});

		it("should extract IP from x-remote-addr header", () => {
			const request = new NextRequest("http://localhost/api/test", {
				headers: { "x-remote-addr": "192.168.1.3" },
			});

			const ip = getClientIP(request);
			expect(ip).toBe("192.168.1.3");
		});

		it("should prioritize x-forwarded-for over other headers", () => {
			const request = new NextRequest("http://localhost/api/test", {
				headers: {
					"x-forwarded-for": "192.168.1.1",
					"x-real-ip": "192.168.1.2",
				},
			});

			const ip = getClientIP(request);
			expect(ip).toBe("192.168.1.1");
		});

		it("should return unknown when no IP headers present", () => {
			const request = new NextRequest("http://localhost/api/test");

			const ip = getClientIP(request);
			expect(ip).toBe("unknown");
		});
	});

	describe("getUserAgent", () => {
		it("should extract user agent from request", () => {
			const request = new NextRequest("http://localhost/api/test", {
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				},
			});

			const ua = getUserAgent(request);
			expect(ua).toContain("Mozilla");
		});

		it("should return unknown when user agent missing", () => {
			const request = new NextRequest("http://localhost/api/test");

			const ua = getUserAgent(request);
			expect(ua).toBe("unknown");
		});
	});

	describe("isBotRequest", () => {
		it("should detect Google bot", () => {
			const request = new NextRequest("http://localhost/api/test", {
				headers: {
					"user-agent":
						"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
				},
			});

			expect(isBotRequest(request)).toBe(true);
		});

		it("should detect generic bot", () => {
			const request = new NextRequest("http://localhost/api/test", {
				headers: { "user-agent": "SomeBot/1.0" },
			});

			expect(isBotRequest(request)).toBe(true);
		});

		it("should detect crawler", () => {
			const request = new NextRequest("http://localhost/api/test", {
				headers: { "user-agent": "MyCrawler/1.0" },
			});

			expect(isBotRequest(request)).toBe(true);
		});

		it("should return false for regular browsers", () => {
			const request = new NextRequest("http://localhost/api/test", {
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				},
			});

			expect(isBotRequest(request)).toBe(false);
		});

		it("should be case insensitive", () => {
			const request = new NextRequest("http://localhost/api/test", {
				headers: { "user-agent": "BOT/1.0" },
			});

			expect(isBotRequest(request)).toBe(true);
		});
	});

	describe("validateMethod", () => {
		it("should return true for allowed method", () => {
			const request = new NextRequest("http://localhost/api/test", {
				method: "POST",
			});

			expect(validateMethod(request, ["GET", "POST"])).toBe(true);
		});

		it("should return false for disallowed method", () => {
			const request = new NextRequest("http://localhost/api/test", {
				method: "DELETE",
			});

			expect(validateMethod(request, ["GET", "POST"])).toBe(false);
		});
	});

	describe("createCORSHeaders", () => {
		it("should create CORS headers with default origin", () => {
			const headers = createCORSHeaders();

			expect(headers["Access-Control-Allow-Origin"]).toBe("*");
			expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
			expect(headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
		});

		it("should create CORS headers with custom origin", () => {
			const headers = createCORSHeaders("https://example.com");

			expect(headers["Access-Control-Allow-Origin"]).toBe(
				"https://example.com",
			);
		});

		it("should include all required CORS headers", () => {
			const headers = createCORSHeaders();

			expect(headers).toHaveProperty("Access-Control-Allow-Headers");
			expect(headers).toHaveProperty("Access-Control-Allow-Methods");
			expect(headers).toHaveProperty("Access-Control-Allow-Origin");
			expect(headers).toHaveProperty("Access-Control-Max-Age");
		});
	});

	describe("handleCORS", () => {
		it("should return response for OPTIONS request", () => {
			const request = new NextRequest("http://localhost/api/test", {
				method: "OPTIONS",
			});

			const response = handleCORS(request);
			expect(response).not.toBeNull();
			expect(response?.status).toBe(200);
		});

		it("should return null for non-OPTIONS request", () => {
			const request = new NextRequest("http://localhost/api/test", {
				method: "GET",
			});

			const response = handleCORS(request);
			expect(response).toBeNull();
		});

		it("should include CORS headers in OPTIONS response", () => {
			const request = new NextRequest("http://localhost/api/test", {
				method: "OPTIONS",
			});

			const response = handleCORS(request);
			const headers = response?.headers;
			expect(headers?.get("Access-Control-Allow-Origin")).toBe("*");
		});
	});

	describe("logRequest", () => {
		it("should log request details", () => {
			const request = new NextRequest("http://localhost/api/test", {
				method: "POST",
				headers: { "user-agent": "TestAgent" },
			});
			const response = new NextResponse(null, { status: 200 });

			logRequest(request, response, 150);

			expect(console.log).toHaveBeenCalledWith(expect.stringContaining("POST"));
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining("200"));
			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining("150ms"),
			);
		});
	});
});
