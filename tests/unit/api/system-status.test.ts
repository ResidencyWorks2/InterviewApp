/**
 * Unit tests for /api/system/status route
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/system/status/route";

// Mock dependencies
const mockGetSystemHealth = vi.fn();
const mockGetCurrentPerformanceMetrics = vi.fn();
const mockGetActive = vi.fn();
const mockSelect = vi.fn();

vi.mock(
	"@/features/scheduling/infrastructure/monitoring/health-service",
	() => ({
		healthService: {
			getSystemHealth: () => mockGetSystemHealth(),
		},
	}),
);

vi.mock(
	"@/features/scheduling/infrastructure/scaling/performance-optimizer",
	() => ({
		performanceOptimizer: {
			getCurrentPerformanceMetrics: () => mockGetCurrentPerformanceMetrics(),
		},
	}),
);

vi.mock("@/infrastructure/redis", () => ({
	contentPackCache: {
		getActive: () => mockGetActive(),
	},
}));

vi.mock("@/infrastructure/supabase/server", () => ({
	createClient: vi.fn(() => ({
		from: vi.fn(() => ({
			select: mockSelect,
		})),
	})),
}));

vi.mock("@/infrastructure/logging/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("/api/system/status", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetSystemHealth.mockResolvedValue({
			status: "healthy",
			services: [],
			timestamp: new Date().toISOString(),
			uptime: 1000,
			version: "1.0.0",
		});
		mockGetCurrentPerformanceMetrics.mockReturnValue({
			application: {
				responseTime: 100,
				errorRate: 0.01,
				throughput: 50,
			},
		});
		mockSelect.mockReturnValue({
			eq: vi.fn().mockReturnValue({
				order: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue({
						data: [],
						error: null,
					}),
				}),
			}),
		});
		mockGetActive.mockResolvedValue(null);
	});

	describe("GET", () => {
		it("should return system status with healthy database", async () => {
			const response = await GET();
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.database.status).toBe("connected");
			expect(json.contentPack).toBeDefined();
			expect(json.performance).toBeDefined();
		});

		it("should return disconnected status for degraded system", async () => {
			mockGetSystemHealth.mockResolvedValue({
				status: "degraded",
				services: [],
				timestamp: new Date().toISOString(),
				uptime: 1000,
				version: "1.0.0",
			});

			const response = await GET();
			const json = await response.json();

			expect(json.database.status).toBe("disconnected");
		});

		it("should return error status for unhealthy system", async () => {
			mockGetSystemHealth.mockResolvedValue({
				status: "unhealthy",
				services: [],
				timestamp: new Date().toISOString(),
				uptime: 1000,
				version: "1.0.0",
			});

			const response = await GET();
			const json = await response.json();

			expect(json.database.status).toBe("error");
			expect(json.analytics.status).toBe("error");
		});

		it("should include active content pack when found in database", async () => {
			mockSelect.mockReturnValue({
				eq: vi.fn().mockReturnValue({
					order: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue({
							data: [
								{
									id: "pack-1",
									name: "Test Pack",
									version: "1.0",
									activated_at: "2024-01-01",
									activated_by: "user-1",
								},
							],
							error: null,
						}),
					}),
				}),
			});

			const response = await GET();
			const json = await response.json();

			expect(json.contentPack.isActive).toBe(true);
			expect(json.contentPack.name).toBe("Test Pack");
		});

		it("should fallback to cache when database query fails", async () => {
			mockSelect.mockReturnValue({
				eq: vi.fn().mockReturnValue({
					order: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue({
							data: null,
							error: { message: "Database error" },
						}),
					}),
				}),
			});

			mockGetActive.mockResolvedValue({
				name: "Cached Pack",
				version: "1.0",
			});

			const response = await GET();
			const json = await response.json();

			expect(json.contentPack.isActive).toBe(true);
			expect(json.contentPack.name).toBe("Cached Pack");
		});

		it("should include performance metrics", async () => {
			const response = await GET();
			const json = await response.json();

			expect(json.performance).toEqual({
				averageResponseTime: 100,
				errorRate: 0.01,
				requestCount: 50,
			});
		});

		it("should include uptime information", async () => {
			const response = await GET();
			const json = await response.json();

			expect(json.uptime).toHaveProperty("startTime");
			expect(json.uptime.startTime).toBeDefined();
		});

		it("should handle errors gracefully and return fallback status", async () => {
			mockGetSystemHealth.mockRejectedValue(new Error("Service error"));

			const response = await GET();
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.database.status).toBe("error");
			expect(json.contentPack.isActive).toBe(false);
		});
	});
});
