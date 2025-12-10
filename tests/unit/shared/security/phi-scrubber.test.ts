/**
 * Unit tests for PhiScrubber
 */

import { describe, expect, it } from "vitest";
import { PhiScrubber } from "@/shared/security/phi-scrubber";

describe("PhiScrubber", () => {
	describe("scrubUserInput", () => {
		it("should scrub email addresses", () => {
			const input = "Contact me at john@example.com for details";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).toBe("Contact me at [EMAIL_REDACTED] for details");
		});

		it("should scrub phone numbers", () => {
			const input = "Call me at 555-123-4567";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).toContain("[PHONE_REDACTED]");
		});

		it("should scrub both email and phone", () => {
			const input = "Contact john@example.com or call 555-123-4567";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).toContain("[EMAIL_REDACTED]");
			expect(result).toContain("[PHONE_REDACTED]");
		});

		it("should handle multiple emails", () => {
			const input = "Email alice@test.com and bob@test.com";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result.split("[EMAIL_REDACTED]").length).toBe(3); // 2 emails + text
		});

		it("should return empty string for empty input", () => {
			expect(PhiScrubber.scrubUserInput("")).toBe("");
		});

		it("should return non-string input as-is", () => {
			expect(PhiScrubber.scrubUserInput(null as any)).toBe(null);
			expect(PhiScrubber.scrubUserInput(undefined as any)).toBe(undefined);
		});

		it("should handle text without PHI", () => {
			const input = "This is normal text without any PHI";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).toBe(input);
		});
	});

	describe("isPhiPresent", () => {
		it("should detect email addresses", () => {
			expect(PhiScrubber.isPhiPresent("Contact john@example.com")).toBe(true);
		});

		it("should detect phone numbers", () => {
			expect(PhiScrubber.isPhiPresent("Call 555-123-4567")).toBe(true);
		});

		it("should return false for text without PHI", () => {
			expect(PhiScrubber.isPhiPresent("Normal text")).toBe(false);
		});

		it("should return false for empty string", () => {
			expect(PhiScrubber.isPhiPresent("")).toBe(false);
		});

		it("should return false for null or undefined", () => {
			expect(PhiScrubber.isPhiPresent(null as any)).toBe(false);
			expect(PhiScrubber.isPhiPresent(undefined as any)).toBe(false);
		});
	});
});
