/**
 * E2E tests for checklist user flows
 * Tests opening checklist modal from category chip and completing items
 */

import { expect, test } from "@playwright/test";

test.describe("Checklist Flow", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to a drill page with evaluation results
		// This assumes there's a drill page with evaluation results
		// Adjust the URL based on your actual routing structure
		await page.goto("/drill/test-evaluation-id");
	});

	test("should open checklist modal when clicking category chip", async ({
		page,
	}) => {
		// Wait for evaluation results to load
		await page.waitForSelector('[data-testid="evaluation-results"]', {
			timeout: 5000,
		});

		// Find a category chip (adjust selector based on actual implementation)
		const categoryChip = page
			.locator('[data-category="Communication"]')
			.first();

		// Click the category chip
		await categoryChip.click();

		// Verify modal opens
		await expect(
			page.locator('[role="dialog"]').filter({ hasText: "Communication" }),
		).toBeVisible();

		// Verify modal shows checklist items or skeleton loaders
		const modal = page.locator('[role="dialog"]');
		await expect(modal).toBeVisible();

		// Check for either skeleton loaders or checklist items
		const hasSkeletons = await page
			.locator(".h-12.w-full")
			.count()
			.then((count) => count > 0);
		const hasItems = await page
			.locator('[data-testid="checklist-item"]')
			.count()
			.then((count) => count > 0);

		expect(hasSkeletons || hasItems).toBe(true);
	});

	test("should display skeleton loaders while fetching checklist", async ({
		page,
	}) => {
		// Intercept the API call to add delay
		await page.route("**/api/checklist*", async (route) => {
			// Add delay to simulate network latency
			await new Promise((resolve) => setTimeout(resolve, 500));
			await route.continue();
		});

		await page.goto("/drill/test-evaluation-id");
		await page.waitForSelector('[data-testid="evaluation-results"]');

		// Click category chip
		const categoryChip = page
			.locator('[data-category="Communication"]')
			.first();
		await categoryChip.click();

		// Verify skeleton loaders appear
		const skeletons = page.locator(".h-12.w-full");
		await expect(skeletons.first()).toBeVisible({ timeout: 1000 });
	});

	test("should check and uncheck checklist items", async ({ page }) => {
		await page.goto("/drill/test-evaluation-id");
		await page.waitForSelector('[data-testid="evaluation-results"]');

		// Open checklist modal
		const categoryChip = page
			.locator('[data-category="Communication"]')
			.first();
		await categoryChip.click();

		// Wait for checklist items to load
		await page.waitForSelector('[data-testid="checklist-item"]', {
			timeout: 5000,
		});

		// Get first unchecked item
		const firstItem = page
			.locator('[data-testid="checklist-item"]')
			.filter({ hasNot: page.locator('[data-completed="true"]') })
			.first();

		if ((await firstItem.count()) > 0) {
			// Click to check
			await firstItem.click();

			// Verify item is now checked (optimistic update)
			await expect(firstItem.locator('[data-completed="true"]')).toBeVisible({
				timeout: 2000,
			});
		}
	});

	test("should show error toast when checklist fetch fails", async ({
		page,
	}) => {
		// Intercept and fail the API call
		await page.route("**/api/checklist*", (route) => {
			route.fulfill({
				status: 500,
				body: JSON.stringify({ error: "Server error" }),
			});
		});

		await page.goto("/drill/test-evaluation-id");
		await page.waitForSelector('[data-testid="evaluation-results"]');

		// Open checklist modal
		const categoryChip = page
			.locator('[data-category="Communication"]')
			.first();
		await categoryChip.click();

		// Verify error toast appears
		await expect(
			page.locator('[role="alert"]').filter({ hasText: "Failed to load" }),
		).toBeVisible({ timeout: 5000 });
	});
});
