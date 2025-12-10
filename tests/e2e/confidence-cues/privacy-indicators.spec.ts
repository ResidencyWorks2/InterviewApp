/**
 * E2E Test: Privacy Indicators Visibility
 * Tests privacy copy and PD badge visibility on dashboard and drill pages
 *
 * @file tests/e2e/confidence-cues/privacy-indicators.spec.ts
 */

import { expect, test } from "@playwright/test";

test.describe("Privacy Indicators E2E", () => {
	test("should display privacy copy and PD badge on dashboard page", async ({
		page,
	}) => {
		// Navigate to dashboard
		await page.goto("/dashboard");

		// Wait for page to load
		await page.waitForLoadState("networkidle");

		// Check for privacy copy text
		await expect(
			page.getByText(/your data is encrypted and secure/i),
		).toBeVisible();

		// Check for PD badge
		const privacyBadge = page.getByRole("link", { name: /privacy/i });
		await expect(privacyBadge).toBeVisible();
		await expect(privacyBadge).toHaveAttribute("href", "/privacy");
	});

	test("should display privacy copy and PD badge on drill page", async ({
		page,
	}) => {
		// Navigate to a drill page
		await page.goto("/drill/test-question-id?evaluation=test-eval-id");

		// Wait for page to load
		await page.waitForLoadState("networkidle");

		// Check for privacy copy text (in footer)
		await expect(
			page.getByText(/your data is encrypted and secure/i),
		).toBeVisible();

		// Check for PD badge
		const privacyBadge = page.getByRole("link", { name: /privacy/i });
		await expect(privacyBadge).toBeVisible();
		await expect(privacyBadge).toHaveAttribute("href", "/privacy");
	});

	test("should navigate to privacy page when PD badge is clicked", async ({
		page,
	}) => {
		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");

		// Click PD badge
		const privacyBadge = page.getByRole("link", { name: /privacy/i });
		await privacyBadge.click();

		// Verify navigation to privacy page
		await expect(page).toHaveURL(/\/privacy/);
		await expect(page.getByText(/privacy.*data protection/i)).toBeVisible();
	});

	test("should have accessible ARIA labels on privacy components", async ({
		page,
	}) => {
		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");

		// Check privacy copy has ARIA label
		const privacySection = page.getByRole("region", {
			name: /privacy and data protection/i,
		});
		await expect(privacySection).toBeVisible();

		// Check PD badge has ARIA label
		const privacyBadge = page.getByRole("link", {
			name: /view privacy and data protection policy/i,
		});
		await expect(privacyBadge).toBeVisible();
	});

	test("should be responsive on mobile viewport", async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");

		// Privacy components should still be visible on mobile
		await expect(
			page.getByText(/your data is encrypted and secure/i),
		).toBeVisible();
		await expect(page.getByRole("link", { name: /privacy/i })).toBeVisible();
	});

	test("should be responsive on tablet viewport", async ({ page }) => {
		// Set tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 });

		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");

		// Privacy components should still be visible on tablet
		await expect(
			page.getByText(/your data is encrypted and secure/i),
		).toBeVisible();
		await expect(page.getByRole("link", { name: /privacy/i })).toBeVisible();
	});

	test("should be responsive on desktop viewport", async ({ page }) => {
		// Set desktop viewport
		await page.setViewportSize({ width: 1920, height: 1080 });

		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");

		// Privacy components should still be visible on desktop
		await expect(
			page.getByText(/your data is encrypted and secure/i),
		).toBeVisible();
		await expect(page.getByRole("link", { name: /privacy/i })).toBeVisible();
	});
});
