/**
 * Unit tests for TranscriptRateLimit
 */

import { beforeEach, describe, expect, it } from "vitest";
import { TranscriptRateLimit } from "@/infrastructure/rate-limit/TranscriptRateLimit";

describe("TranscriptRateLimit", () => {
	let rateLimit: TranscriptRateLimit;

	beforeEach(() => {
		rateLimit = new TranscriptRateLimit(60000, 10); // 10 requests per 60s
	});

	it("should allow requests within limit", () => {
		const userId = "user-1";

		for (let i = 0; i < 10; i++) {
			expect(rateLimit.allow(userId)).toBe(true);
		}
	});

	it("should deny requests exceeding limit", () => {
		const userId = "user-1";

		// Make 10 allowed requests
		for (let i = 0; i < 10; i++) {
			expect(rateLimit.allow(userId)).toBe(true);
		}

		// 11th request should be denied
		expect(rateLimit.allow(userId)).toBe(false);
	});

	it("should track limits per user independently", () => {
		const user1 = "user-1";
		const user2 = "user-2";

		// User 1 makes 10 requests
		for (let i = 0; i < 10; i++) {
			expect(rateLimit.allow(user1)).toBe(true);
		}

		// User 2 should still be allowed
		expect(rateLimit.allow(user2)).toBe(true);
		expect(rateLimit.allow(user1)).toBe(false);
	});

	it("should reset window after timeout", async () => {
		const userId = "user-1";
		const shortWindow = 100; // 100ms window
		const shortRateLimit = new TranscriptRateLimit(shortWindow, 2);

		// Make 2 requests
		expect(shortRateLimit.allow(userId)).toBe(true);
		expect(shortRateLimit.allow(userId)).toBe(true);
		expect(shortRateLimit.allow(userId)).toBe(false); // Exceeded

		// Wait for window to reset
		await new Promise((resolve) => setTimeout(resolve, shortWindow + 50));

		// Should be allowed again after reset
		expect(shortRateLimit.allow(userId)).toBe(true);
	});

	it("should use default values when not specified", () => {
		const defaultLimit = new TranscriptRateLimit();
		const userId = "user-1";

		// Should allow at least one request
		expect(defaultLimit.allow(userId)).toBe(true);
	});

	it("should handle custom window and max requests", () => {
		const customLimit = new TranscriptRateLimit(30000, 5); // 5 requests per 30s
		const userId = "user-1";

		for (let i = 0; i < 5; i++) {
			expect(customLimit.allow(userId)).toBe(true);
		}

		expect(customLimit.allow(userId)).toBe(false);
	});
});
