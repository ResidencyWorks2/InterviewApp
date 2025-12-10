/**
 * Unit tests for DiagnosticService
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiagnosticService } from "@/infrastructure/diagnostics/diagnostic-service";

// Mock dependencies
const mockGetSystemHealth = vi.fn();
vi.mock(
	"@/features/scheduling/infrastructure/monitoring/health-service",
	() => ({
		healthService: {
			getSystemHealth: () => mockGetSystemHealth(),
		},
	}),
);

vi.mock("@/infrastructure/logging/logger", () => ({
	logger: {
		error: vi.fn(),
		info: vi.fn(),
	},
}));

describe("DiagnosticService", () => {
	let service: DiagnosticService;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset singleton instance
		(DiagnosticService as any).instance = undefined;
		service = DiagnosticService.getInstance();
		mockGetSystemHealth.mockResolvedValue({
			status: "healthy",
			services: [
				{
					service: "database",
					status: "healthy",
					details: { version: "14.0" },
				},
			],
			timestamp: new Date().toISOString(),
			uptime: 1000,
			version: "1.0.0",
		});
	});

	describe("getInstance", () => {
		it("should return singleton instance", () => {
			const instance1 = DiagnosticService.getInstance();
			const instance2 = DiagnosticService.getInstance();

			expect(instance1).toBe(instance2);
		});
	});

	describe("getDiagnosticInfo", () => {
		it("should return comprehensive diagnostic information", async () => {
			const info = await service.getDiagnosticInfo();

			expect(info).toHaveProperty("timestamp");
			expect(info).toHaveProperty("system");
			expect(info).toHaveProperty("application");
			expect(info).toHaveProperty("database");
			expect(info).toHaveProperty("cache");
			expect(info).toHaveProperty("external");
			expect(info).toHaveProperty("performance");
			expect(info).toHaveProperty("errors");
		});

		it("should include system information", async () => {
			const info = await service.getDiagnosticInfo();

			expect(info.system).toHaveProperty("platform");
			expect(info.system).toHaveProperty("arch");
			expect(info.system).toHaveProperty("nodeVersion");
			expect(info.system).toHaveProperty("memory");
			expect(info.system).toHaveProperty("cpu");
			expect(info.system).toHaveProperty("uptime");
		});

		it("should include application information", async () => {
			const info = await service.getDiagnosticInfo();

			expect(info.application).toHaveProperty("version");
			expect(info.application).toHaveProperty("environment");
			expect(info.application).toHaveProperty("buildTime");
		});

		it("should handle database errors gracefully", async () => {
			mockGetSystemHealth.mockRejectedValue(new Error("Database unavailable"));

			// The service catches errors in individual methods and returns partial info
			const info = await service.getDiagnosticInfo();

			// Should still return diagnostic info with error state
			expect(info).toHaveProperty("database");
			expect(info.database.connected).toBe(false);
			expect(info.database.errors).toBeGreaterThan(0);
		});
	});

	describe("generateDiagnosticReport", () => {
		it("should generate markdown report", async () => {
			const report = await service.generateDiagnosticReport();

			expect(typeof report).toBe("string");
			expect(report).toContain("# Diagnostic Report");
		});

		it("should include system information in report", async () => {
			const report = await service.generateDiagnosticReport();

			expect(report).toMatch(/System|Platform|Memory/i);
		});
	});

	describe("recordError", () => {
		it("should record error information", async () => {
			const error = new Error("Test error");
			service.recordError(error, "test-component", "high");

			// Verify error was recorded by checking diagnostic info
			const info = await service.getDiagnosticInfo();
			expect(info.errors.length).toBeGreaterThan(0);
		});

		it("should handle different severity levels", async () => {
			const error1 = new Error("Low severity");
			const error2 = new Error("Critical severity");

			service.recordError(error1, "component", "low");
			service.recordError(error2, "component", "critical");

			const info = await service.getDiagnosticInfo();
			expect(info.errors.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("getErrorInfo", () => {
		it("should return array of error information in diagnostic info", async () => {
			const info = await service.getDiagnosticInfo();

			expect(Array.isArray(info.errors)).toBe(true);
		});

		it("should include recorded errors", async () => {
			service.recordError(new Error("Test"), "test", "medium");

			// Access errors through diagnostic info
			const info = await service.getDiagnosticInfo();
			expect(info.errors.length).toBeGreaterThan(0);
		});
	});

	describe("updatePerformanceMetrics", () => {
		it("should update performance metrics", async () => {
			service.updatePerformanceMetrics({
				responseTime: { average: 100, p95: 200, p99: 300 },
			});

			// Verify through diagnostic info
			const info = await service.getDiagnosticInfo();
			expect(info.performance.responseTime.average).toBe(100);
		});
	});

	describe("resolveError", () => {
		it("should resolve an error", async () => {
			const error = new Error("Test error");
			service.recordError(error, "test-component", "high");

			// Get error ID from diagnostic info
			const info = await service.getDiagnosticInfo();
			const errorId = info.errors[0]?.id;

			if (errorId) {
				const resolved = service.resolveError(errorId);
				expect(resolved).toBe(true);
			}
		});

		it("should return false for non-existent error", () => {
			const resolved = service.resolveError("non-existent");
			expect(resolved).toBe(false);
		});
	});
});
