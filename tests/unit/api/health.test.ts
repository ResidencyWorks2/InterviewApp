/**
 * Unit tests for /api/health route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

// Mock health service
const mockGetSystemHealth = vi.fn();

vi.mock(
	"@/features/scheduling/infrastructure/monitoring/health-service",
	() => ({
		healthService: {
			getSystemHealth: () => mockGetSystemHealth(),
		},
	}),
);

describe("/api/health", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 200 and healthy status when system is healthy", async () => {
		mockGetSystemHealth.mockResolvedValue({
			status: "healthy",
			timestamp: new Date().toISOString(),
			uptime: 3600000,
			services: {
				database: { status: "healthy" },
				redis: { status: "healthy" },
			},
		});

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.status).toBe("healthy");
		expect(data.timestamp).toBeDefined();
	});

	it("should return 503 when system is unhealthy", async () => {
		mockGetSystemHealth.mockResolvedValue({
			status: "unhealthy",
			timestamp: new Date().toISOString(),
			uptime: 3600000,
			services: {
				database: { status: "unhealthy", error: "Connection failed" },
			},
		});

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(503);
		expect(data.status).toBe("unhealthy");
	});

	it("should return 503 when system is degraded", async () => {
		mockGetSystemHealth.mockResolvedValue({
			status: "degraded",
			timestamp: new Date().toISOString(),
			uptime: 3600000,
			services: {
				database: { status: "healthy" },
				redis: { status: "degraded", warning: "High latency" },
			},
		});

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(503);
		expect(data.status).toBe("degraded");
	});

	it("should handle errors and return 500", async () => {
		mockGetSystemHealth.mockRejectedValue(new Error("Service unavailable"));

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.status).toBe("unhealthy");
		expect(data.error).toBe("Service unavailable");
		expect(data.timestamp).toBeDefined();
	});

	it("should handle non-Error exceptions", async () => {
		mockGetSystemHealth.mockRejectedValue("String error");

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.status).toBe("unhealthy");
		expect(data.error).toBe("Unknown error");
	});
});
