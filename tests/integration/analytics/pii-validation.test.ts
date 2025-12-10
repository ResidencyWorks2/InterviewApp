/**
 * Integration Test: PII Scrubbing Validation
 * Verifies all analytics events pass PII scrubbing validation
 *
 * This test validates T034 and T041 requirements
 *
 * @file tests/integration/analytics/pii-validation.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/features/notifications/application/analytics";
import { PostHogAnalyticsService } from "@/features/notifications/infrastructure/posthog/AnalyticsService";
import { AnalyticsValidator } from "@/shared/security/analytics-validator";
import { DataScrubber } from "@/shared/security/data-scrubber";

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

		shutdown() {}
		flush() {}
	}

	return { PostHog: MockPostHog };
});

describe("PII Scrubbing Validation - All Analytics Events", () => {
	let analyticsService: PostHogAnalyticsService;

	beforeEach(() => {
		(globalThis as any).__capturedAnalyticsEvents = [];
		analyticsService = new PostHogAnalyticsService({
			apiKey: "test-key",
			host: "https://app.posthog.com",
			enabled: true,
			debug: false,
		});
	});

	it("should scrub PII from specialty_cue_hit events", async () => {
		const eventProperties = {
			specialty: "pediatrics",
			drill_id: "550e8400-e29b-41d4-a716-446655440000",
			user_id: "user-123",
			timestamp: new Date().toISOString(),
			email: "user@example.com",
			phone: "555-123-4567",
		};

		await analyticsService.track(
			ANALYTICS_EVENTS.SPECIALTY_CUE_HIT,
			eventProperties,
			"user-123",
		);

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		const capturedEvent = events[0];

		// Verify PII is scrubbed
		expect(capturedEvent.properties.email).toBe("[REDACTED]");
		expect(capturedEvent.properties.phone).toBe("[REDACTED]");
		expect(capturedEvent.properties.user_id).not.toContain("@");
		expect(capturedEvent.distinctId).not.toContain("@");
	});

	it("should scrub PII from checklist_opened events", async () => {
		const eventProperties = {
			evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
			category: "communication",
			user_id: "user-123",
			timestamp: new Date().toISOString(),
			email: "user@example.com",
			name: "John Doe",
		};

		await analyticsService.track(
			ANALYTICS_EVENTS.CHECKLIST_OPENED,
			eventProperties,
			"user-123",
		);

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		const capturedEvent = events[0];

		expect(capturedEvent.properties.email).toBe("[REDACTED]");
		expect(capturedEvent.properties.name).toBe("[REDACTED]");
		expect(capturedEvent.properties.user_id).not.toContain("@");
	});

	it("should scrub PII from checklist_completed events", async () => {
		const eventProperties = {
			evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
			category: "communication",
			completion_count: 5,
			user_id: "user-123",
			timestamp: new Date().toISOString(),
			email: "user@example.com",
			phone: "555-123-4567",
		};

		await analyticsService.track(
			ANALYTICS_EVENTS.CHECKLIST_COMPLETED,
			eventProperties,
			"user-123",
		);

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		const capturedEvent = events[0];

		expect(capturedEvent.properties.email).toBe("[REDACTED]");
		expect(capturedEvent.properties.phone).toBe("[REDACTED]");
		expect(capturedEvent.properties.user_id).not.toContain("@");
	});

	it("should scrub PII from pd_verify_clicked events", async () => {
		const eventProperties = {
			user_id: "user-123",
			timestamp: new Date().toISOString(),
			email: "user@example.com",
			name: "John Doe",
			phone: "555-123-4567",
		};

		await analyticsService.track(
			ANALYTICS_EVENTS.PD_VERIFY_CLICKED,
			eventProperties,
			"user-123",
		);

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		const capturedEvent = events[0];

		expect(capturedEvent.properties.email).toBe("[REDACTED]");
		expect(capturedEvent.properties.name).toBe("[REDACTED]");
		expect(capturedEvent.properties.phone).toBe("[REDACTED]");
		expect(capturedEvent.properties.user_id).not.toContain("@");
	});

	it("should validate all events pass AnalyticsValidator", () => {
		const testEvents = [
			{
				event: ANALYTICS_EVENTS.SPECIALTY_CUE_HIT,
				properties: {
					specialty: "pediatrics",
					drill_id: "550e8400-e29b-41d4-a716-446655440000",
					user_id: "anon_abc123",
					timestamp: new Date().toISOString(),
				},
			},
			{
				event: ANALYTICS_EVENTS.CHECKLIST_OPENED,
				properties: {
					evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
					category: "communication",
					user_id: "anon_abc123",
					timestamp: new Date().toISOString(),
				},
			},
			{
				event: ANALYTICS_EVENTS.CHECKLIST_COMPLETED,
				properties: {
					evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
					category: "communication",
					completion_count: 5,
					user_id: "anon_abc123",
					timestamp: new Date().toISOString(),
				},
			},
			{
				event: ANALYTICS_EVENTS.PD_VERIFY_CLICKED,
				properties: {
					user_id: "anon_abc123",
					timestamp: new Date().toISOString(),
				},
			},
		];

		// All events should pass validation
		testEvents.forEach(({ event, properties }) => {
			const scrubbed = DataScrubber.scrubObject(properties);
			expect(() => {
				AnalyticsValidator.validateEvent(event, scrubbed);
			}).not.toThrow();
		});
	});

	it("should reject events with email addresses in user_id", () => {
		const invalidEvent = {
			event: ANALYTICS_EVENTS.SPECIALTY_CUE_HIT,
			properties: {
				specialty: "pediatrics",
				drill_id: "550e8400-e29b-41d4-a716-446655440000",
				user_id: "user@example.com", // Invalid - email address
				timestamp: new Date().toISOString(),
			},
		};

		expect(() => {
			AnalyticsValidator.validateEvent(
				invalidEvent.event,
				invalidEvent.properties,
			);
		}).toThrow();
	});
});
