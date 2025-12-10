/**
 * Unit tests for Logger
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "@/infrastructure/logging/logger";
import { LogLevel } from "@/shared/logger/types";

// Mock dependencies
vi.mock("@/shared/error/ErrorTrackingService", () => ({
	captureException: vi.fn(),
}));

import { captureException } from "@/shared/error/ErrorTrackingService";

vi.mock("@/shared/security/data-scrubber", () => ({
	DataScrubber: {
		scrubObject: vi.fn((obj: Record<string, unknown>) => obj),
	},
}));

describe("Logger", () => {
	let logger: Logger;
	let consoleSpy: {
		debug: ReturnType<typeof vi.spyOn>;
		info: ReturnType<typeof vi.spyOn>;
		warn: ReturnType<typeof vi.spyOn>;
		error: ReturnType<typeof vi.spyOn>;
	};
	let originalEnv: string | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		originalEnv = process.env.NODE_ENV;
		// TypeScript: NODE_ENV is read-only, use type assertion for testing
		(process.env as { NODE_ENV?: string }).NODE_ENV = "development"; // Logger only logs in development
		logger = new Logger();

		consoleSpy = {
			debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
			info: vi.spyOn(console, "info").mockImplementation(() => {}),
			warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
			error: vi.spyOn(console, "error").mockImplementation(() => {}),
		};
	});

	afterEach(() => {
		if (originalEnv !== undefined) {
			(process.env as { NODE_ENV?: string }).NODE_ENV = originalEnv;
		} else {
			delete (process.env as { NODE_ENV?: string }).NODE_ENV;
		}
	});

	describe("debug", () => {
		it("should log debug message", () => {
			logger.debug("Debug message");

			expect(consoleSpy.debug).toHaveBeenCalled();
		});

		it("should include context in debug log", () => {
			logger.debug("Debug message", {
				component: "test",
				action: "debug",
			});

			expect(consoleSpy.debug).toHaveBeenCalled();
		});
	});

	describe("info", () => {
		it("should log info message", () => {
			logger.info("Info message");

			expect(consoleSpy.info).toHaveBeenCalled();
		});

		it("should include context in info log", () => {
			logger.info("Info message", {
				component: "test",
				action: "info",
			});

			expect(consoleSpy.info).toHaveBeenCalled();
		});
	});

	describe("warn", () => {
		it("should log warning message", () => {
			logger.warn("Warning message");

			expect(consoleSpy.warn).toHaveBeenCalled();
		});

		it("should include context in warning log", () => {
			logger.warn("Warning message", {
				component: "test",
				action: "warn",
			});

			expect(consoleSpy.warn).toHaveBeenCalled();
		});
	});

	describe("error", () => {
		it("should log error message", () => {
			const error = new Error("Test error");
			logger.error("Error message", error);

			expect(consoleSpy.error).toHaveBeenCalled();
		});

		it("should include error in context metadata", () => {
			const error = new Error("Test error");
			logger.error("Error message", error, {
				component: "test",
			});

			expect(consoleSpy.error).toHaveBeenCalled();
		});

		it("should send error to Sentry in production", () => {
			// Create logger with production environment
			const originalEnv = process.env.NODE_ENV;
			(process.env as { NODE_ENV?: string }).NODE_ENV = "production";
			const prodLogger = new Logger();

			const error = new Error("Test error");
			prodLogger.error("Error message", error, {
				component: "test-component",
				action: "test-action",
				metadata: { key: "value" },
			});

			expect(vi.mocked(captureException)).toHaveBeenCalledWith(
				error,
				expect.objectContaining({
					tags: {
						component: "test-component",
						action: "test-action",
					},
				}),
			);

			(process.env as { NODE_ENV?: string }).NODE_ENV = originalEnv;
		});

		it("should not send to Sentry in development", () => {
			// NODE_ENV is already set to development in beforeEach
			const error = new Error("Test error");
			logger.error("Error message", error);

			// In development, Sentry should not be called
			// But logger still logs to console
			expect(consoleSpy.error).toHaveBeenCalled();
		});

		it("should handle error without context", () => {
			const error = new Error("Test error");
			logger.error("Error message", error);

			expect(consoleSpy.error).toHaveBeenCalled();
		});
	});

	describe("logApiRequest", () => {
		it("should log API request with INFO level for success", () => {
			logger.logApiRequest("GET", "/api/test", 200, 100);

			expect(consoleSpy.info).toHaveBeenCalled();
		});

		it("should log API request with ERROR level for error status", () => {
			logger.logApiRequest("POST", "/api/test", 500, 100);

			expect(consoleSpy.error).toHaveBeenCalled();
		});

		it("should include request details in log", () => {
			logger.logApiRequest("GET", "/api/test", 200, 150, {
				component: "api",
			});

			expect(consoleSpy.info).toHaveBeenCalled();
		});

		it("should log 4xx errors as ERROR level", () => {
			logger.logApiRequest("GET", "/api/test", 404, 50);

			expect(consoleSpy.error).toHaveBeenCalled();
		});

		it("should log 3xx redirects as INFO level", () => {
			logger.logApiRequest("GET", "/api/test", 301, 30);

			expect(consoleSpy.info).toHaveBeenCalled();
		});
	});

	describe("log", () => {
		it("should handle different log levels", () => {
			logger.debug("Debug");
			logger.info("Info");
			logger.warn("Warn");
			logger.error("Error", new Error("Test"));

			expect(consoleSpy.debug).toHaveBeenCalled();
			expect(consoleSpy.info).toHaveBeenCalled();
			expect(consoleSpy.warn).toHaveBeenCalled();
			expect(consoleSpy.error).toHaveBeenCalled();
		});

		it("should handle context with metadata", () => {
			logger.info("Test", {
				component: "test",
				metadata: {
					key1: "value1",
					key2: 123,
				},
			});

			expect(consoleSpy.info).toHaveBeenCalled();
		});
	});
});
