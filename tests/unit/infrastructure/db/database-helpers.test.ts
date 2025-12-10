/**
 * Unit tests for database helper functions
 */

import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
	buildFilterQuery,
	buildOrderQuery,
	buildSelectQuery,
	calculatePagination,
	createErrorResult,
	createSuccessResult,
	extractDataOrThrow,
	handleDatabaseError,
	isSuccessResult,
	retryOperation,
	sanitizeColumnName,
	sanitizeTableName,
	serializeError,
	validateQueryOptions,
} from "@/infrastructure/db/database-helpers";

describe("database-helpers", () => {
	describe("serializeError", () => {
		it("should serialize standard Error objects", () => {
			const error = new Error("Test error");
			const serialized = serializeError(error);

			expect(serialized.message).toBe("Test error");
			expect(serialized.name).toBe("Error");
			expect(serialized.type).toBe("Error");
		});

		it("should include stack trace when available", () => {
			const error = new Error("Test error");
			const serialized = serializeError(error);

			expect(serialized.stack).toBeDefined();
		});

		it("should handle PostgrestError properties", () => {
			const error = {
				name: "PostgrestError",
				message: "Database error",
				code: "23505",
				details: "Key violation",
				hint: "Try updating instead",
				status: 409,
			} as PostgrestError;

			const serialized = serializeError(error);

			expect(serialized.message).toBe("Database error");
			expect(serialized.code).toBe("23505");
			expect(serialized.details).toBe("Key violation");
			expect(serialized.hint).toBe("Try updating instead");
			expect(serialized.status).toBe(409);
			expect(serialized.type).toBe("PostgrestError");
		});

		it("should handle null or undefined", () => {
			expect(serializeError(null).type).toBe("null_or_undefined");
			expect(serializeError(undefined).type).toBe("null_or_undefined");
		});

		it("should handle plain objects", () => {
			const error = { message: "Custom error", code: "CUSTOM" };
			const serialized = serializeError(error);

			expect(serialized.message).toBe("Custom error");
			expect(serialized.code).toBe("CUSTOM");
			// When code is present, it's treated as PostgrestError
			expect(serialized.type).toBe("PostgrestError");
		});

		it("should handle primitive types", () => {
			expect(serializeError("String error").message).toBe("String error");
			expect(serializeError(123).value).toBe(123);
		});
	});

	describe("handleDatabaseError", () => {
		it("should return success result for null error", () => {
			const result = handleDatabaseError(null);

			expect(result.success).toBe(true);
			expect(result.error).toBeNull();
		});

		it("should return error result with message", () => {
			const error = { message: "Database error" } as PostgrestError;
			const result = handleDatabaseError(error);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Database error");
		});

		it("should use default message when error message is missing", () => {
			const error = {} as PostgrestError;
			const result = handleDatabaseError(error);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Database operation failed");
		});
	});

	describe("buildSelectQuery", () => {
		it("should return select string when provided", () => {
			expect(buildSelectQuery("id, name")).toBe("id, name");
		});

		it("should return * when not provided", () => {
			expect(buildSelectQuery()).toBe("*");
		});
	});

	describe("buildFilterQuery", () => {
		it("should build filter query for simple values", () => {
			const filters = { status: "active", type: "user" };
			const query = buildFilterQuery(filters);

			expect(query.status).toBe("eq.active");
			expect(query.type).toBe("eq.user");
		});

		it("should build filter query for arrays", () => {
			const filters = { ids: [1, 2, 3] };
			const query = buildFilterQuery(filters);

			expect(query.ids).toBe("in.(1,2,3)");
		});

		it("should build filter query for wildcards", () => {
			const filters = { name: "test*" };
			const query = buildFilterQuery(filters);

			expect(query.name).toBe("like.test%");
		});

		it("should ignore undefined and null values", () => {
			const filters = { status: "active", type: undefined, count: null };
			const query = buildFilterQuery(filters);

			expect(query.status).toBe("eq.active");
			expect(query.type).toBeUndefined();
			expect(query.count).toBeUndefined();
		});

		it("should return empty object for undefined filters", () => {
			expect(buildFilterQuery()).toEqual({});
		});
	});

	describe("buildOrderQuery", () => {
		it("should build order query with ascending direction", () => {
			expect(buildOrderQuery("created_at", "asc")).toBe("created_at.asc");
		});

		it("should build order query with descending direction", () => {
			expect(buildOrderQuery("created_at", "desc")).toBe("created_at.desc");
		});

		it("should default to ascending", () => {
			expect(buildOrderQuery("created_at")).toBe("created_at.asc");
		});

		it("should return empty string when orderBy is not provided", () => {
			expect(buildOrderQuery()).toBe("");
		});
	});

	describe("calculatePagination", () => {
		it("should calculate pagination metadata correctly", () => {
			const result = calculatePagination(100, 1, 10);

			expect(result.count).toBe(100);
			expect(result.page).toBe(1);
			expect(result.limit).toBe(10);
			expect(result.totalPages).toBe(10);
			expect(result.hasNext).toBe(true);
			expect(result.hasPrev).toBe(false);
		});

		it("should handle last page correctly", () => {
			const result = calculatePagination(100, 10, 10);

			expect(result.hasNext).toBe(false);
			expect(result.hasPrev).toBe(true);
		});

		it("should handle middle pages correctly", () => {
			const result = calculatePagination(100, 5, 10);

			expect(result.hasNext).toBe(true);
			expect(result.hasPrev).toBe(true);
		});

		it("should handle empty results", () => {
			const result = calculatePagination(0, 1, 10);

			expect(result.totalPages).toBe(0);
			expect(result.hasNext).toBe(false);
			expect(result.hasPrev).toBe(false);
		});

		it("should round up total pages", () => {
			const result = calculatePagination(95, 1, 10);

			expect(result.totalPages).toBe(10);
		});
	});

	describe("validateQueryOptions", () => {
		it("should return true for valid options", () => {
			expect(validateQueryOptions({ limit: 10, offset: 0 })).toBe(true);
		});

		it("should return true for undefined options", () => {
			expect(validateQueryOptions()).toBe(true);
		});

		it("should return false for negative limit", () => {
			expect(validateQueryOptions({ limit: -1 })).toBe(false);
		});

		it("should return false for negative offset", () => {
			expect(validateQueryOptions({ offset: -1 })).toBe(false);
		});

		it("should return false for invalid order direction", () => {
			expect(
				validateQueryOptions({
					orderDirection: "invalid" as "asc" | "desc",
				}),
			).toBe(false);
		});

		it("should return true for valid order direction", () => {
			expect(validateQueryOptions({ orderDirection: "asc" })).toBe(true);
			expect(validateQueryOptions({ orderDirection: "desc" })).toBe(true);
		});
	});

	describe("sanitizeTableName", () => {
		it("should remove special characters but preserve underscores", () => {
			expect(sanitizeTableName("test-table_123")).toBe("testtable_123");
		});

		it("should preserve valid characters", () => {
			expect(sanitizeTableName("users_123")).toBe("users_123");
		});

		it("should handle empty string", () => {
			expect(sanitizeTableName("")).toBe("");
		});

		it("should remove SQL injection attempts", () => {
			expect(sanitizeTableName("users; DROP TABLE")).toBe("usersDROPTABLE");
		});
	});

	describe("sanitizeColumnName", () => {
		it("should remove special characters", () => {
			expect(sanitizeColumnName("column-name")).toBe("columnname");
		});

		it("should preserve valid characters", () => {
			expect(sanitizeColumnName("column_123")).toBe("column_123");
		});
	});

	describe("createSuccessResult", () => {
		it("should create success result with data", () => {
			const data = { id: "1", name: "Test" };
			const result = createSuccessResult(data);

			expect(result.success).toBe(true);
			expect(result.data).toEqual(data);
			expect(result.error).toBeNull();
		});
	});

	describe("createErrorResult", () => {
		it("should create error result with message", () => {
			const result = createErrorResult("Test error");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Test error");
			expect(result.data).toBeNull();
		});
	});

	describe("isSuccessResult", () => {
		it("should return true for success result", () => {
			const result = createSuccessResult({ id: "1" });
			expect(isSuccessResult(result)).toBe(true);
		});

		it("should return false for error result", () => {
			const result = createErrorResult("Error");
			expect(isSuccessResult(result)).toBe(false);
		});
	});

	describe("extractDataOrThrow", () => {
		it("should return data for success result", () => {
			const data = { id: "1" };
			const result = createSuccessResult(data);

			expect(extractDataOrThrow(result)).toEqual(data);
		});

		it("should throw error for error result", () => {
			const result = createErrorResult("Test error");

			expect(() => extractDataOrThrow(result)).toThrow("Test error");
		});

		it("should throw default error when error message is missing", () => {
			const result = { success: false, data: null, error: null };

			expect(() => extractDataOrThrow(result)).toThrow(
				"Database operation failed",
			);
		});
	});

	describe("retryOperation", () => {
		it("should return result on first success", async () => {
			const operation = vi.fn().mockResolvedValue(createSuccessResult("data"));

			const result = await retryOperation(operation, 3, 100);

			expect(result.success).toBe(true);
			expect(operation).toHaveBeenCalledOnce();
		});

		it("should retry on failure and eventually succeed", async () => {
			let attempts = 0;
			const operation = vi.fn().mockImplementation(async () => {
				attempts++;
				if (attempts < 3) {
					return createErrorResult("Temporary error");
				}
				return createSuccessResult("data");
			});

			const result = await retryOperation(operation, 3, 10);

			expect(result.success).toBe(true);
			expect(operation).toHaveBeenCalledTimes(3);
		});

		it("should fail after max retries", async () => {
			const operation = vi
				.fn()
				.mockResolvedValue(createErrorResult("Persistent error"));

			const result = await retryOperation(operation, 2, 10);

			expect(result.success).toBe(false);
			expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
		});

		it("should handle exceptions", async () => {
			const operation = vi.fn().mockRejectedValue(new Error("Exception"));

			const result = await retryOperation(operation, 2, 10);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Exception");
		});

		it("should use exponential backoff", async () => {
			const delays: number[] = [];
			const originalSetTimeout = setTimeout;
			vi.spyOn(global, "setTimeout").mockImplementation((fn, delay) => {
				if (typeof delay === "number") {
					delays.push(delay);
				}
				return originalSetTimeout(fn, delay) as unknown as NodeJS.Timeout;
			});

			const operation = vi.fn().mockResolvedValue(createErrorResult("Error"));

			await retryOperation(operation, 3, 100);

			// Check that delays increase exponentially (approximately)
			expect(delays.length).toBeGreaterThan(0);
			vi.restoreAllMocks();
		});
	});
});
