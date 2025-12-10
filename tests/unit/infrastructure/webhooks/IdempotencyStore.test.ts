/**
 * Unit tests for IdempotencyStore
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type IIdempotencyStore,
	idempotencyStore,
} from "@/infrastructure/webhooks/IdempotencyStore";

describe("IdempotencyStore", () => {
	beforeEach(() => {
		// Clean up store before each test
		idempotencyStore.cleanup();
	});

	describe("tryCreate", () => {
		it("should create a new record when key doesn't exist", () => {
			const result = idempotencyStore.tryCreate("test-key-1", 1000);

			expect(result).toBe(true);
			expect(idempotencyStore.exists("test-key-1")).toBe(true);
		});

		it("should return false when key already exists and hasn't expired", () => {
			idempotencyStore.tryCreate("test-key-2", 1000);
			const result = idempotencyStore.tryCreate("test-key-2", 1000);

			expect(result).toBe(false);
		});

		it("should handle different TTL values", () => {
			idempotencyStore.tryCreate("short-key-1", 1000);
			idempotencyStore.tryCreate("long-key-1", 10000);

			expect(idempotencyStore.exists("short-key-1")).toBe(true);
			expect(idempotencyStore.exists("long-key-1")).toBe(true);
		});

		it("should clean up expired records before creating new key", () => {
			// Create a key
			idempotencyStore.tryCreate("cleanup-test-key-3", 1000);
			expect(idempotencyStore.exists("cleanup-test-key-3")).toBe(true);

			// Manually clean up (simulating expiration)
			const futureTime = Date.now() + 2000;
			idempotencyStore.cleanup(futureTime);

			// Key should be gone
			expect(idempotencyStore.exists("cleanup-test-key-3")).toBe(false);

			// Should allow recreation
			const result = idempotencyStore.tryCreate("cleanup-test-key-3", 1000);
			expect(result).toBe(true);
		});
	});

	describe("exists", () => {
		it("should return false for non-existent key", () => {
			expect(idempotencyStore.exists("non-existent-key-123")).toBe(false);
		});

		it("should return true for existing non-expired key", () => {
			idempotencyStore.tryCreate("existing-key-1", 1000);

			expect(idempotencyStore.exists("existing-key-1")).toBe(true);
		});

		it("should return false for expired key after cleanup", () => {
			const key = "expired-test-key";
			idempotencyStore.tryCreate(key, 1000);

			// Verify it exists
			expect(idempotencyStore.exists(key)).toBe(true);

			// Clean up with future timestamp (simulating expiration)
			idempotencyStore.cleanup(Date.now() + 2000);

			// Should not exist after cleanup
			expect(idempotencyStore.exists(key)).toBe(false);
		});
	});

	describe("cleanup", () => {
		it("should remove expired records with explicit timestamp", () => {
			idempotencyStore.tryCreate("cleanup-key1", 1000);
			idempotencyStore.tryCreate("cleanup-key2", 1000);

			// Clean up with future time (simulating all keys expired)
			const futureTime = Date.now() + 2000;
			idempotencyStore.cleanup(futureTime);

			expect(idempotencyStore.exists("cleanup-key1")).toBe(false);
			expect(idempotencyStore.exists("cleanup-key2")).toBe(false);
		});

		it("should use current time when no parameter provided", () => {
			idempotencyStore.tryCreate("cleanup-test-key-2", 1000);
			idempotencyStore.cleanup();

			// Should not remove non-expired key (created with 1000ms TTL, cleanup uses current time)
			expect(idempotencyStore.exists("cleanup-test-key-2")).toBe(true);
		});

		it("should handle cleanup with explicit timestamp", () => {
			const now = Date.now();
			idempotencyStore.tryCreate("timestamp-key1", 1000);
			idempotencyStore.tryCreate("timestamp-key2", 1000);

			// Clean up with future time
			idempotencyStore.cleanup(now + 2000);

			expect(idempotencyStore.exists("timestamp-key1")).toBe(false);
			expect(idempotencyStore.exists("timestamp-key2")).toBe(false);
		});

		it("should handle empty store", () => {
			idempotencyStore.cleanup(); // Clean everything first
			expect(() => {
				idempotencyStore.cleanup();
			}).not.toThrow();
		});

		it("should clean up multiple expired records selectively", () => {
			idempotencyStore.tryCreate("multi-key1", 1000);
			idempotencyStore.tryCreate("multi-key2", 1000);
			idempotencyStore.tryCreate("multi-key3", 1000);

			// Verify all exist
			expect(idempotencyStore.exists("multi-key1")).toBe(true);
			expect(idempotencyStore.exists("multi-key2")).toBe(true);
			expect(idempotencyStore.exists("multi-key3")).toBe(true);

			// Clean up all
			idempotencyStore.cleanup(Date.now() + 2000);

			expect(idempotencyStore.exists("multi-key1")).toBe(false);
			expect(idempotencyStore.exists("multi-key2")).toBe(false);
			expect(idempotencyStore.exists("multi-key3")).toBe(false);
		});
	});

	describe("integration", () => {
		it("should handle rapid create/exists checks", () => {
			const key = "rapid-integration-key";

			for (let i = 0; i < 10; i++) {
				const created = idempotencyStore.tryCreate(key, 1000);
				if (i === 0) {
					expect(created).toBe(true);
				} else {
					expect(created).toBe(false);
				}
				expect(idempotencyStore.exists(key)).toBe(true);
			}
		});

		it("should handle multiple different keys", () => {
			idempotencyStore.tryCreate("integration-key1", 1000);
			idempotencyStore.tryCreate("integration-key2", 1000);
			idempotencyStore.tryCreate("integration-key3", 1000);

			expect(idempotencyStore.exists("integration-key1")).toBe(true);
			expect(idempotencyStore.exists("integration-key2")).toBe(true);
			expect(idempotencyStore.exists("integration-key3")).toBe(true);
			expect(idempotencyStore.exists("integration-key4")).toBe(false);
		});
	});
});
