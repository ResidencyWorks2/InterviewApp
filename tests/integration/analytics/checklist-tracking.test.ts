/**
 * Integration Tests: Checklist Analytics Event Tracking
 * Verifies checklist_opened and checklist_completed events fire correctly and transmit to PostHog
 *
 * @file tests/integration/analytics/checklist-tracking.test.ts
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

describe("Checklist Analytics Event Tracking Integration Tests", () => {
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

	describe("checklist_opened event", () => {
		it("should track checklist_opened event with correct properties", async () => {
			const userId = "user-123";
			const evaluationId = "660e8400-e29b-41d4-a716-446655440000";
			const category = "communication";

			await analyticsService.track(
				"checklist_opened",
				{
					evaluation_id: evaluationId,
					category,
					user_id: userId,
					timestamp: new Date().toISOString(),
				},
				userId,
			);

			await new Promise((resolve) => setTimeout(resolve, 50));

			const events = (globalThis as any).__capturedAnalyticsEvents || [];
			expect(events.length).toBeGreaterThan(0);
			const capturedEvent = events[0];
			expect(capturedEvent.event).toBe("checklist_opened");
			expect(capturedEvent.distinctId).toBe(userId);
			expect(capturedEvent.properties.evaluation_id).toBe(evaluationId);
			expect(capturedEvent.properties.category).toBe(category);
			expect(capturedEvent.properties.user_id).toBe(userId);
			expect(capturedEvent.properties.timestamp).toBeDefined();
		});

		it("should scrub PII from checklist_opened event properties", async () => {
			await analyticsService.track(
				"checklist_opened",
				{
					evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
					category: "communication",
					user_id: "user-123",
					timestamp: new Date().toISOString(),
					email: "user@example.com", // Should be scrubbed
				},
				"user-123",
			);

			await new Promise((resolve) => setTimeout(resolve, 50));

			const events = (globalThis as any).__capturedAnalyticsEvents || [];
			const capturedEvent = events[0];
			expect(capturedEvent.properties.email).toBe("[REDACTED]");
		});
	});

	describe("checklist_completed event", () => {
		it("should track checklist_completed event with correct properties", async () => {
			const userId = "user-123";
			const evaluationId = "660e8400-e29b-41d4-a716-446655440000";
			const category = "communication";
			const completionCount = 5;

			await analyticsService.track(
				"checklist_completed",
				{
					evaluation_id: evaluationId,
					category,
					completion_count: completionCount,
					user_id: userId,
					timestamp: new Date().toISOString(),
				},
				userId,
			);

			await new Promise((resolve) => setTimeout(resolve, 50));

			const events = (globalThis as any).__capturedAnalyticsEvents || [];
			expect(events.length).toBeGreaterThan(0);
			const capturedEvent = events[0];
			expect(capturedEvent.event).toBe("checklist_completed");
			expect(capturedEvent.distinctId).toBe(userId);
			expect(capturedEvent.properties.evaluation_id).toBe(evaluationId);
			expect(capturedEvent.properties.category).toBe(category);
			expect(capturedEvent.properties.completion_count).toBe(completionCount);
			expect(capturedEvent.properties.user_id).toBe(userId);
			expect(capturedEvent.properties.timestamp).toBeDefined();
		});

		it("should scrub PII from checklist_completed event properties", async () => {
			await analyticsService.track(
				"checklist_completed",
				{
					evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
					category: "communication",
					completion_count: 5,
					user_id: "user-123",
					timestamp: new Date().toISOString(),
					phone: "555-123-4567", // Should be scrubbed
				},
				"user-123",
			);

			await new Promise((resolve) => setTimeout(resolve, 50));

			const events = (globalThis as any).__capturedAnalyticsEvents || [];
			const capturedEvent = events[0];
			expect(capturedEvent.properties.phone).toBe("[REDACTED]");
		});

		it("should track completion_count as number", async () => {
			await analyticsService.track(
				"checklist_completed",
				{
					evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
					category: "communication",
					completion_count: 5,
					user_id: "user-123",
					timestamp: new Date().toISOString(),
				},
				"user-123",
			);

			await new Promise((resolve) => setTimeout(resolve, 50));

			const events = (globalThis as any).__capturedAnalyticsEvents || [];
			const capturedEvent = events[0];
			expect(typeof capturedEvent.properties.completion_count).toBe("number");
			expect(capturedEvent.properties.completion_count).toBe(5);
		});
	});

	it("should use anonymized user_id (not email) in distinctId", async () => {
		const anonymizedUserId = "anon_abc123def456";

		await analyticsService.track(
			"checklist_opened",
			{
				evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
				category: "communication",
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
});
