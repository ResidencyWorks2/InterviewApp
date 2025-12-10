/**
 * Integration Tests: Privacy Badge Analytics Event Tracking
 * Verifies pd_verify_clicked event fires correctly and transmits to PostHog
 *
 * @file tests/integration/analytics/privacy-badge-tracking.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostHogAnalyticsService } from "@/features/notifications/infrastructure/posthog/AnalyticsService";

// Mock PostHog client - capture capture calls
let capturedEvents: Array<{
	distinctId: string;
	event: string;
	properties: Record<string, unknown>;
}> = [];

vi.mock("posthog-node", () => {
	class MockPostHog {
		capture(event: {
			distinctId: string;
			event: string;
			properties: Record<string, unknown>;
		}) {
			(globalThis as any).__capturedAnalyticsEvents = ((globalThis as any)
				.__capturedAnalyticsEvents || []) as Array<{
				distinctId: string;
				event: string;
				properties: Record<string, unknown>;
			}>;
			(globalThis as any).__capturedAnalyticsEvents.push(event);
		}

		shutdown() {
			// Mock implementation
		}

		flush() {
			// Mock implementation
		}
	}

	return {
		PostHog: MockPostHog,
	};
});

describe("Privacy Badge Analytics Event Tracking Integration Tests", () => {
	let analyticsService: PostHogAnalyticsService;

	beforeEach(() => {
		vi.clearAllMocks();
		capturedEvents = [];
		(globalThis as any).__capturedAnalyticsEvents = [];
		analyticsService = new PostHogAnalyticsService({
			apiKey: "test-key",
			host: "https://app.posthog.com",
			enabled: true,
			debug: false,
		});
	});

	it("should track pd_verify_clicked event with correct properties", async () => {
		const userId = "user-123";

		await analyticsService.track(
			"pd_verify_clicked",
			{
				user_id: userId,
				timestamp: new Date().toISOString(),
			},
			userId,
		);

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		expect(events.length).toBeGreaterThan(0);
		const capturedEvent = events[0];
		expect(capturedEvent.event).toBe("pd_verify_clicked");
		expect(capturedEvent.distinctId).toBe(userId);
		expect(capturedEvent.properties.user_id).toBe(userId);
		expect(capturedEvent.properties.timestamp).toBeDefined();
	});

	it("should scrub PII from pd_verify_clicked event properties", async () => {
		await analyticsService.track(
			"pd_verify_clicked",
			{
				user_id: "user-123",
				timestamp: new Date().toISOString(),
				email: "user@example.com", // Should be scrubbed
				name: "John Doe", // Should be scrubbed
			},
			"user-123",
		);

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		const capturedEvent = events[0];
		expect(capturedEvent.properties.email).toBe("[REDACTED]");
		expect(capturedEvent.properties.name).toBe("[REDACTED]");
	});

	it("should use anonymized user_id (not email) in distinctId", async () => {
		const anonymizedUserId = "anon_abc123def456";

		await analyticsService.track(
			"pd_verify_clicked",
			{
				user_id: anonymizedUserId,
				timestamp: new Date().toISOString(),
			},
			anonymizedUserId,
		);

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		const capturedEvent = events[0];
		expect(capturedEvent.distinctId).toBe(anonymizedUserId);
		expect(capturedEvent.distinctId).not.toContain("@");
	});

	it("should handle anonymous users (no user_id)", async () => {
		await analyticsService.track(
			"pd_verify_clicked",
			{
				user_id: "anonymous",
				timestamp: new Date().toISOString(),
			},
			"anonymous",
		);

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		expect(events.length).toBeGreaterThan(0);
		const capturedEvent = events[0];
		expect(capturedEvent.distinctId).toBe("anonymous");
		expect(capturedEvent.properties.user_id).toBe("anonymous");
	});
});
