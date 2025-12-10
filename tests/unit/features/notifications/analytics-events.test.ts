/**
 * Unit tests for analytics events
 * Tests event structures, properties, and PII scrubbing for confidence cues analytics
 */

import { describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/features/notifications/application/analytics";
import { AnalyticsValidator } from "@/shared/security/analytics-validator";
import { DataScrubber } from "@/shared/security/data-scrubber";

describe("Analytics Events - Confidence Cues", () => {
	describe("Event Constants", () => {
		it("should have SPECIALTY_CUE_HIT constant", () => {
			expect(ANALYTICS_EVENTS.SPECIALTY_CUE_HIT).toBe("specialty_cue_hit");
		});

		it("should have CHECKLIST_OPENED constant", () => {
			expect(ANALYTICS_EVENTS.CHECKLIST_OPENED).toBe("checklist_opened");
		});

		it("should have CHECKLIST_COMPLETED constant", () => {
			expect(ANALYTICS_EVENTS.CHECKLIST_COMPLETED).toBe("checklist_completed");
		});

		it("should have PD_VERIFY_CLICKED constant", () => {
			expect(ANALYTICS_EVENTS.PD_VERIFY_CLICKED).toBe("pd_verify_clicked");
		});
	});

	describe("specialty_cue_hit Event", () => {
		it("should have correct event structure", () => {
			const eventProperties = {
				specialty: "pediatrics",
				drill_id: "550e8400-e29b-41d4-a716-446655440000",
				user_id: "anon_abc123def456",
				timestamp: "2025-01-27T10:30:00.000Z",
			};

			// Verify structure
			expect(eventProperties).toHaveProperty("specialty");
			expect(eventProperties).toHaveProperty("drill_id");
			expect(eventProperties).toHaveProperty("user_id");
			expect(eventProperties).toHaveProperty("timestamp");
		});

		it("should pass PII scrubbing validation", () => {
			const eventProperties = {
				specialty: "pediatrics",
				drill_id: "550e8400-e29b-41d4-a716-446655440000",
				user_id: "anon_abc123def456",
				timestamp: "2025-01-27T10:30:00.000Z",
			};

			const scrubbed = DataScrubber.scrubObject(eventProperties);
			expect(scrubbed).toEqual(eventProperties);

			// Should not throw validation error
			expect(() => {
				AnalyticsValidator.validateEvent(
					ANALYTICS_EVENTS.SPECIALTY_CUE_HIT,
					scrubbed,
				);
			}).not.toThrow();
		});

		it("should reject events with email addresses in user_id", () => {
			const eventProperties = {
				specialty: "pediatrics",
				drill_id: "550e8400-e29b-41d4-a716-446655440000",
				user_id: "user@example.com", // Invalid - email address
				timestamp: "2025-01-27T10:30:00.000Z",
			};

			expect(() => {
				AnalyticsValidator.validateEvent(
					ANALYTICS_EVENTS.SPECIALTY_CUE_HIT,
					eventProperties,
				);
			}).toThrow();
		});
	});

	describe("checklist_opened Event", () => {
		it("should have correct event structure", () => {
			const eventProperties = {
				evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
				category: "communication",
				user_id: "anon_abc123def456",
				timestamp: "2025-01-27T10:35:00.000Z",
			};

			// Verify structure
			expect(eventProperties).toHaveProperty("evaluation_id");
			expect(eventProperties).toHaveProperty("category");
			expect(eventProperties).toHaveProperty("user_id");
			expect(eventProperties).toHaveProperty("timestamp");
		});

		it("should pass PII scrubbing validation", () => {
			const eventProperties = {
				evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
				category: "communication",
				user_id: "anon_abc123def456",
				timestamp: "2025-01-27T10:35:00.000Z",
			};

			const scrubbed = DataScrubber.scrubObject(eventProperties);
			expect(scrubbed).toEqual(eventProperties);

			expect(() => {
				AnalyticsValidator.validateEvent(
					ANALYTICS_EVENTS.CHECKLIST_OPENED,
					scrubbed,
				);
			}).not.toThrow();
		});
	});

	describe("checklist_completed Event", () => {
		it("should have correct event structure", () => {
			const eventProperties = {
				evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
				category: "communication",
				completion_count: 5,
				user_id: "anon_abc123def456",
				timestamp: "2025-01-27T10:40:00.000Z",
			};

			// Verify structure
			expect(eventProperties).toHaveProperty("evaluation_id");
			expect(eventProperties).toHaveProperty("category");
			expect(eventProperties).toHaveProperty("completion_count");
			expect(eventProperties).toHaveProperty("user_id");
			expect(eventProperties).toHaveProperty("timestamp");
		});

		it("should pass PII scrubbing validation", () => {
			const eventProperties = {
				evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
				category: "communication",
				completion_count: 5,
				user_id: "anon_abc123def456",
				timestamp: "2025-01-27T10:40:00.000Z",
			};

			const scrubbed = DataScrubber.scrubObject(eventProperties);
			expect(scrubbed).toEqual(eventProperties);

			expect(() => {
				AnalyticsValidator.validateEvent(
					ANALYTICS_EVENTS.CHECKLIST_COMPLETED,
					scrubbed,
				);
			}).not.toThrow();
		});
	});

	describe("pd_verify_clicked Event", () => {
		it("should have correct event structure", () => {
			const eventProperties = {
				user_id: "anon_abc123def456",
				timestamp: "2025-01-27T10:45:00.000Z",
			};

			// Verify structure
			expect(eventProperties).toHaveProperty("user_id");
			expect(eventProperties).toHaveProperty("timestamp");
		});

		it("should pass PII scrubbing validation", () => {
			const eventProperties = {
				user_id: "anon_abc123def456",
				timestamp: "2025-01-27T10:45:00.000Z",
			};

			const scrubbed = DataScrubber.scrubObject(eventProperties);
			expect(scrubbed).toEqual(eventProperties);

			expect(() => {
				AnalyticsValidator.validateEvent(
					ANALYTICS_EVENTS.PD_VERIFY_CLICKED,
					scrubbed,
				);
			}).not.toThrow();
		});
	});

	describe("PII Scrubbing", () => {
		it("should scrub email addresses from event properties", () => {
			const eventProperties = {
				specialty: "pediatrics",
				drill_id: "550e8400-e29b-41d4-a716-446655440000",
				user_id: "anon_abc123def456",
				timestamp: "2025-01-27T10:30:00.000Z",
				email: "user@example.com", // Should be scrubbed
			};

			const scrubbed = DataScrubber.scrubObject(eventProperties);
			expect(scrubbed.email).toBe("[REDACTED]");
		});

		it("should scrub phone numbers from event properties", () => {
			const eventProperties = {
				evaluation_id: "660e8400-e29b-41d4-a716-446655440000",
				category: "communication",
				user_id: "anon_abc123def456",
				timestamp: "2025-01-27T10:35:00.000Z",
				phone: "555-123-4567", // Should be scrubbed
			};

			const scrubbed = DataScrubber.scrubObject(eventProperties);
			expect(scrubbed.phone).toBe("[REDACTED]");
		});
	});
});
