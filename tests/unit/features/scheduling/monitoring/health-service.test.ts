/**
 * Unit tests for HealthService
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock OpenAI before importing health-service (which imports openai-evaluation-service)
// Note: vi.mock is hoisted, so we must define the mock class inside the factory
vi.mock("openai", () => {
	class MockOpenAI {
		constructor() {}
		chat = {
			completions: {
				create: vi.fn().mockResolvedValue({
					choices: [{ message: { content: "Test" } }],
				}),
			},
		};
	}
	return {
		default: MockOpenAI,
		OpenAI: MockOpenAI,
	};
});

import { HealthService } from "@/features/scheduling/infrastructure/monitoring/health-service";

describe("HealthService", () => {
	let healthService: HealthService;

	beforeEach(() => {
		healthService = new HealthService();
	});

	describe("registerHealthCheck", () => {
		it("should register a health check function", async () => {
			const mockCheck = vi.fn().mockResolvedValue({
				status: "healthy" as const,
				service: "test-service",
				timestamp: new Date().toISOString(),
			});

			healthService.registerHealthCheck("test-service", mockCheck);
			const result = await healthService.getServiceHealth("test-service");

			expect(result).toBeDefined();
			expect(result?.status).toBe("healthy");
			expect(mockCheck).toHaveBeenCalledOnce();
		});
	});

	describe("getServiceHealth", () => {
		it("should return null for unregistered service", async () => {
			const result = await healthService.getServiceHealth("unknown-service");
			expect(result).toBeNull();
		});

		it("should return health status for registered service", async () => {
			const mockCheck = vi.fn().mockResolvedValue({
				status: "healthy" as const,
				service: "test-service",
				timestamp: new Date().toISOString(),
			});

			healthService.registerHealthCheck("test-service", mockCheck);
			const result = await healthService.getServiceHealth("test-service");

			expect(result).toBeDefined();
			expect(result?.status).toBe("healthy");
			expect(result?.service).toBe("test-service");
		});

		it("should handle errors in health check", async () => {
			const mockCheck = vi.fn().mockRejectedValue(new Error("Service error"));

			healthService.registerHealthCheck("failing-service", mockCheck);
			const result = await healthService.getServiceHealth("failing-service");

			expect(result).toBeDefined();
			expect(result?.status).toBe("unhealthy");
			expect(result?.error).toBe("Service error");
		});

		it("should handle non-Error exceptions", async () => {
			const mockCheck = vi.fn().mockRejectedValue("String error");

			healthService.registerHealthCheck("failing-service", mockCheck);
			const result = await healthService.getServiceHealth("failing-service");

			expect(result).toBeDefined();
			expect(result?.status).toBe("unhealthy");
			expect(result?.error).toBe("Unknown error");
		});
	});

	describe("getSystemHealth", () => {
		it("should return healthy status when all services are healthy", async () => {
			const mockCheck1 = vi.fn().mockResolvedValue({
				status: "healthy" as const,
				service: "service1",
				timestamp: new Date().toISOString(),
			});

			const mockCheck2 = vi.fn().mockResolvedValue({
				status: "healthy" as const,
				service: "service2",
				timestamp: new Date().toISOString(),
			});

			healthService.registerHealthCheck("service1", mockCheck1);
			healthService.registerHealthCheck("service2", mockCheck2);

			const result = await healthService.getSystemHealth();

			expect(result.status).toBe("healthy");
			expect(result.services).toHaveLength(2);
		});

		it("should return unhealthy status when any service is unhealthy", async () => {
			const mockCheck1 = vi.fn().mockResolvedValue({
				status: "healthy" as const,
				service: "service1",
				timestamp: new Date().toISOString(),
			});

			const mockCheck2 = vi.fn().mockResolvedValue({
				status: "unhealthy" as const,
				service: "service2",
				timestamp: new Date().toISOString(),
				error: "Connection failed",
			});

			healthService.registerHealthCheck("service1", mockCheck1);
			healthService.registerHealthCheck("service2", mockCheck2);

			const result = await healthService.getSystemHealth();

			expect(result.status).toBe("unhealthy");
		});

		it("should return degraded status when service is degraded", async () => {
			const mockCheck1 = vi.fn().mockResolvedValue({
				status: "healthy" as const,
				service: "service1",
				timestamp: new Date().toISOString(),
			});

			const mockCheck2 = vi.fn().mockResolvedValue({
				status: "degraded" as const,
				service: "service2",
				timestamp: new Date().toISOString(),
				warning: "High latency",
			});

			healthService.registerHealthCheck("service1", mockCheck1);
			healthService.registerHealthCheck("service2", mockCheck2);

			const result = await healthService.getSystemHealth();

			expect(result.status).toBe("degraded");
		});

		it("should prioritize unhealthy over degraded", async () => {
			const mockCheck1 = vi.fn().mockResolvedValue({
				status: "degraded" as const,
				service: "service1",
				timestamp: new Date().toISOString(),
			});

			const mockCheck2 = vi.fn().mockResolvedValue({
				status: "unhealthy" as const,
				service: "service2",
				timestamp: new Date().toISOString(),
			});

			healthService.registerHealthCheck("service1", mockCheck1);
			healthService.registerHealthCheck("service2", mockCheck2);

			const result = await healthService.getSystemHealth();

			expect(result.status).toBe("unhealthy");
		});

		it("should handle errors in health checks", async () => {
			const mockCheck = vi.fn().mockRejectedValue(new Error("Check failed"));

			healthService.registerHealthCheck("failing-service", mockCheck);
			const result = await healthService.getSystemHealth();

			expect(result.status).toBe("unhealthy");
			expect(result.services).toHaveLength(1);
			expect(result.services[0].error).toBe("Check failed");
		});

		it("should include uptime in result", async () => {
			// Wait a bit to ensure uptime is non-zero
			await new Promise((resolve) => setTimeout(resolve, 10));

			const result = await healthService.getSystemHealth();

			expect(result.uptime).toBeGreaterThan(0);
			expect(result.timestamp).toBeDefined();
		});

		it("should include version in result", async () => {
			const result = await healthService.getSystemHealth();

			expect(result.version).toBeDefined();
		});
	});
});
