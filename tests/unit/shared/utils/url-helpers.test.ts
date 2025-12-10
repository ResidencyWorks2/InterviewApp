/**
 * Unit tests for URL helper utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	constructUrl,
	getAllowedRedirectUrls,
	getAuthCallbackUrl,
	getBaseUrl,
	getEmailConfirmationUrl,
	getMagicLinkUrl,
	getPasswordResetUrl,
	isSameOrigin,
} from "@/shared/utils/url-helpers";

// Mock environment config
vi.mock("@/infrastructure/config/environment", () => ({
	getAppUrl: vi.fn(() => "https://app.example.com"),
}));

describe("url-helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getBaseUrl", () => {
		it("should return the base URL from environment config", () => {
			const baseUrl = getBaseUrl();
			expect(baseUrl).toBe("https://app.example.com");
		});
	});

	describe("constructUrl", () => {
		it("should construct a full URL with a path that starts with /", () => {
			const url = constructUrl("/dashboard");
			expect(url).toBe("https://app.example.com/dashboard");
		});

		it("should add leading slash if path doesn't start with /", () => {
			const url = constructUrl("dashboard");
			expect(url).toBe("https://app.example.com/dashboard");
		});

		it("should handle root path", () => {
			const url = constructUrl("/");
			expect(url).toBe("https://app.example.com/");
		});

		it("should handle nested paths", () => {
			const url = constructUrl("/api/users/123");
			expect(url).toBe("https://app.example.com/api/users/123");
		});
	});

	describe("getAuthCallbackUrl", () => {
		it("should return callback URL without provider", () => {
			const url = getAuthCallbackUrl();
			expect(url).toBe("https://app.example.com/auth/callback");
		});

		it("should return callback URL with provider", () => {
			const url = getAuthCallbackUrl("google");
			expect(url).toBe("https://app.example.com/auth/callback/google");
		});

		it("should handle different providers", () => {
			expect(getAuthCallbackUrl("github")).toBe(
				"https://app.example.com/auth/callback/github",
			);
			expect(getAuthCallbackUrl("microsoft")).toBe(
				"https://app.example.com/auth/callback/microsoft",
			);
		});
	});

	describe("getMagicLinkUrl", () => {
		it("should return the magic link callback URL", () => {
			const url = getMagicLinkUrl();
			expect(url).toBe("https://app.example.com/auth/callback");
		});
	});

	describe("getPasswordResetUrl", () => {
		it("should return the password reset URL", () => {
			const url = getPasswordResetUrl();
			expect(url).toBe("https://app.example.com/auth/reset-password");
		});
	});

	describe("getEmailConfirmationUrl", () => {
		it("should return the email confirmation URL", () => {
			const url = getEmailConfirmationUrl();
			expect(url).toBe("https://app.example.com/auth/confirm-email");
		});
	});

	describe("isSameOrigin", () => {
		it("should return true for URLs with the same origin", () => {
			expect(isSameOrigin("https://app.example.com/dashboard")).toBe(true);
		});

		it("should return false for URLs with different origins", () => {
			expect(isSameOrigin("https://evil.com/dashboard")).toBe(false);
		});

		it("should return false for URLs with different protocols", () => {
			expect(isSameOrigin("http://app.example.com/dashboard")).toBe(false);
		});

		it("should return false for URLs with different ports", () => {
			expect(isSameOrigin("https://app.example.com:8080/dashboard")).toBe(
				false,
			);
		});

		it("should return false for invalid URLs", () => {
			expect(isSameOrigin("not-a-url")).toBe(false);
		});

		it("should return false for empty string", () => {
			expect(isSameOrigin("")).toBe(false);
		});

		it("should return false for relative paths", () => {
			expect(isSameOrigin("/dashboard")).toBe(false);
		});
	});

	describe("getAllowedRedirectUrls", () => {
		it("should return array of allowed redirect URLs", () => {
			const urls = getAllowedRedirectUrls();
			expect(urls).toContain("https://app.example.com");
			expect(urls).toContain("https://app.example.com/");
			expect(urls).toContain("https://app.example.com/dashboard");
			expect(urls).toContain("https://app.example.com/profile");
			expect(urls).toContain("https://app.example.com/auth/callback");
		});

		it("should include localhost URLs for development", () => {
			const urls = getAllowedRedirectUrls();
			expect(urls).toContain("http://localhost:3000");
			expect(urls).toContain("https://localhost:3000");
		});

		it("should return an array", () => {
			const urls = getAllowedRedirectUrls();
			expect(Array.isArray(urls)).toBe(true);
		});
	});
});
