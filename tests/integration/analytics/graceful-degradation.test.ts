/**
 * Integration Test: Analytics Graceful Degradation
 * Verifies analytics tracking failures don't block user interactions
 *
 * This test validates T035 requirement
 *
 * @file tests/integration/analytics/graceful-degradation.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/features/notifications/application/analytics";
import { PostHogAnalyticsService } from "@/features/notifications/infrastructure/posthog/AnalyticsService";

vi.mock("posthog-node", () => {
	class MockPostHog {
		capture() {
			throw new Error("PostHog service unavailable");
		}

		shutdown() {}
		flush() {}
	}

	return { PostHog: MockPostHog };
});

describe("Analytics Graceful Degradation", () => {
	let analyticsService: PostHogAnalyticsService;

	beforeEach(() => {
		analyticsService = new PostHogAnalyticsService({
			apiKey: "test-key",
			host: "https://app.posthog.com",
			enabled: true,
			debug: false,
		});
	});

	it("should not throw errors when PostHog is unavailable", async () => {
		// Analytics tracking should not throw, even if PostHog fails
		await expect(
			analyticsService.track(
				ANALYTICS_EVENTS.SPECIALTY_CUE_HIT,
				{
					specialty: "pediatrics",
					drill_id: "550e8400-e29b-41d4-a716-446655440000",
					user_id: "user-123",
					timestamp: new Date().toISOString(),
				},
				"user-123",
			),
		).resolves.not.toThrow();
	});

	it("should handle disabled analytics service gracefully", async () => {
		const disabledService = new PostHogAnalyticsService({
			apiKey: "test-key",
			host: "https://app.posthog.com",
			enabled: false, // Disabled
			debug: false,
		});

		// Should not throw when disabled
		await expect(
			disabledService.track(
				ANALYTICS_EVENTS.CHECKLIST_OPENED,
				{
					evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
					category: "communication",
					user_id: "user-123",
					timestamp: new Date().toISOString(),
				},
				"user-123",
			),
		).resolves.not.toThrow();
	});

	it("should handle missing API key gracefully", async () => {
		const noKeyService = new PostHogAnalyticsService({
			apiKey: "", // No API key
			host: "https://app.posthog.com",
			enabled: true,
			debug: false,
		});

		// Should not throw when API key is missing
		await expect(
			noKeyService.track(
				ANALYTICS_EVENTS.PD_VERIFY_CLICKED,
				{
					user_id: "user-123",
					timestamp: new Date().toISOString(),
				},
				"user-123",
			),
		).resolves.not.toThrow();
	});
});
