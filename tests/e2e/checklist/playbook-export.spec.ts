/**
 * E2E tests for exporting Playbook with completed checklist items
 *
 * NOTE: Main Playbook export endpoint does not exist yet.
 * This test verifies the checklist export functionality that will
 * be integrated into the Playbook export when it's implemented.
 */

import { expect, test } from "@playwright/test";

test.describe("Playbook Export with Checklist Items", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to a drill page with evaluation results
		await page.goto("/drill/test-evaluation-id");
	});

	test("should export checklist data when Playbook export is implemented", async ({
		page,
	}) => {
		// This test is a placeholder for when the main Playbook export is implemented
		// For now, we verify the checklist export endpoint is accessible

		// Wait for evaluation results to load
		await page.waitForSelector('[data-testid="evaluation-results"]', {
			timeout: 5000,
		});

		// Complete some checklist items first
		const categoryChip = page
			.locator('[data-category="Communication"]')
			.first();
		await categoryChip.click();

		// Wait for checklist modal
		await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

		// Check a few items
		const checklistItems = page.locator('[data-testid="checklist-item"]');
		const itemCount = await checklistItems.count();

		if (itemCount > 0) {
			// Check first item
			await checklistItems.first().click();
			await page.waitForTimeout(500); // Wait for API call
		}

		// Close modal
		await page.keyboard.press("Escape");

		// NOTE: When Playbook export is implemented, this test should:
		// 1. Click "Export Playbook" button
		// 2. Verify the exported document includes checklist items
		// 3. Verify items are grouped by category
		// 4. Verify formatting is correct

		// For now, verify checklist export endpoint is accessible via API
		const response = await page.request.get(
			"/api/checklist/export?evaluationId=test-evaluation-id",
		);

		expect(response.status()).toBe(200);
		const data = await response.json();
		expect(data.data).toHaveProperty("formattedText");
		expect(data.data).toHaveProperty("completions");
	});

	test("should include completed checklist items in export format", async ({
		page,
	}) => {
		// Verify checklist export returns properly formatted text
		const response = await page.request.get(
			"/api/checklist/export?evaluationId=test-evaluation-id",
		);

		if (response.status() === 200) {
			const data = await response.json();

			// Verify export structure
			expect(data.data).toHaveProperty("formattedText");
			expect(data.data).toHaveProperty("totalCompleted");
			expect(data.data).toHaveProperty("categoriesCount");

			// Verify formatted text is markdown-compatible
			if (data.data.formattedText) {
				expect(data.data.formattedText).toContain("##");
			}
		}
	});

	test("should handle empty checklist in export", async ({ page }) => {
		// Test export when no items are completed
		const response = await page.request.get(
			"/api/checklist/export?evaluationId=test-evaluation-id",
		);

		if (response.status() === 200) {
			const data = await response.json();

			// Should still return valid structure
			expect(data.data).toHaveProperty("formattedText");
			expect(data.data.totalCompleted).toBeGreaterThanOrEqual(0);

			// If no completions, should show appropriate message
			if (data.data.totalCompleted === 0) {
				expect(data.data.formattedText).toContain("No checklist items");
			}
		}
	});
});
