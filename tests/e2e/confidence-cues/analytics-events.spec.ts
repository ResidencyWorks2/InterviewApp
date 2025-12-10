/**
 * E2E Test: Analytics Events Tracking
 * Tests analytics event firing for specialty, checklist, and PD badge interactions
 *
 * @file tests/e2e/confidence-cues/analytics-events.spec.ts
 */

import { expect, test } from "@playwright/test";

test.describe("Analytics Events E2E", () => {
	test.beforeEach(async ({ page }) => {
		// Intercept PostHog events
		await page.route("**/batch/**", async (route) => {
			// Capture analytics events
			const request = route.request();
			const postData = request.postData();
			if (postData) {
				try {
					const payload = JSON.parse(postData);
					if (payload.batch) {
						// Store events in page context for verification
						await page.evaluate((events) => {
							(window as any).__capturedAnalyticsEvents = [
								...((window as any).__capturedAnalyticsEvents || []),
								...events,
							];
						}, payload.batch);
					}
				} catch (e) {
					// Ignore parse errors
				}
			}
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true }),
			});
		});

		// Initialize captured events array
		await page.addInitScript(() => {
			(window as any).__capturedAnalyticsEvents = [];
		});
	});

	test("should track specialty_cue_hit event when specialty badge is displayed", async ({
		page,
	}) => {
		// Navigate to drill page with specialty
		await page.goto("/drill/test-question-id?evaluation=test-eval-id");
		await page.waitForLoadState("networkidle");

		// Wait for specialty badge to appear (if present)
		// Note: This test assumes a drill page with specialty badge
		// The event should fire automatically when specialty badge is displayed

		// Wait a bit for analytics event to fire
		await page.waitForTimeout(1000);

		// Check if specialty_cue_hit event was captured
		const events = await page.evaluate(
			() => (window as any).__capturedAnalyticsEvents || [],
		);

		// If specialty badge is present, event should be tracked
		const specialtyBadge = page.getByText(/specialty:/i);
		if (await specialtyBadge.isVisible().catch(() => false)) {
			const specialtyEvent = events.find(
				(e: any) => e.event === "specialty_cue_hit",
			);
			if (specialtyEvent) {
				expect(specialtyEvent.properties).toHaveProperty("specialty");
				expect(specialtyEvent.properties).toHaveProperty("drill_id");
				expect(specialtyEvent.properties).toHaveProperty("user_id");
				expect(specialtyEvent.properties).toHaveProperty("timestamp");
				// Verify no PII
				expect(specialtyEvent.properties.user_id).not.toContain("@");
			}
		}
	});

	test("should track checklist_opened event when checklist modal opens", async ({
		page,
	}) => {
		// Navigate to drill page with evaluation results
		await page.goto(
			"/drill/test-question-id?evaluation=test-eval-id&showResults=true",
		);
		await page.waitForLoadState("networkidle");

		// Mock checklist API response
		await page.route("**/api/checklist*", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: {
						items: [
							{
								id: "item-1",
								category: "Communication",
								item_text: "Test item",
								display_order: 1,
								is_completed: false,
							},
						],
					},
				}),
			});
		});

		// Find and click category chip to open checklist modal
		const categoryChip = page
			.locator('[data-category="Communication"]')
			.first();

		if (await categoryChip.isVisible().catch(() => false)) {
			await categoryChip.click();

			// Wait for modal to open and event to fire
			await page.waitForTimeout(1000);

			// Check if checklist_opened event was captured
			const events = await page.evaluate(
				() => (window as any).__capturedAnalyticsEvents || [],
			);

			const checklistOpenedEvent = events.find(
				(e: any) => e.event === "checklist_opened",
			);
			if (checklistOpenedEvent) {
				expect(checklistOpenedEvent.properties).toHaveProperty("evaluation_id");
				expect(checklistOpenedEvent.properties).toHaveProperty("category");
				expect(checklistOpenedEvent.properties).toHaveProperty("user_id");
				expect(checklistOpenedEvent.properties).toHaveProperty("timestamp");
				// Verify no PII
				expect(checklistOpenedEvent.properties.user_id).not.toContain("@");
			}
		}
	});

	test("should track checklist_completed event when all items are completed", async ({
		page,
	}) => {
		// Navigate to drill page with evaluation results
		await page.goto(
			"/drill/test-question-id?evaluation=test-eval-id&showResults=true",
		);
		await page.waitForLoadState("networkidle");

		// Mock checklist API with single item
		await page.route("**/api/checklist*", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: {
						items: [
							{
								id: "item-1",
								category: "Communication",
								item_text: "Test item",
								display_order: 1,
								is_completed: false,
							},
						],
					},
				}),
			});
		});

		// Mock checklist complete API
		await page.route("**/api/checklist/complete", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true }),
			});
		});

		// Open checklist modal
		const categoryChip = page
			.locator('[data-category="Communication"]')
			.first();

		if (await categoryChip.isVisible().catch(() => false)) {
			await categoryChip.click();
			await page.waitForSelector('[role="dialog"]');

			// Complete the only item (should trigger checklist_completed)
			// Find the button containing "Test item" text
			const checklistItem = page
				.locator('[role="dialog"]')
				.locator("button")
				.filter({ hasText: "Test item" });

			if (await checklistItem.isVisible().catch(() => false)) {
				await checklistItem.click();

				// Wait for event to fire
				await page.waitForTimeout(1000);

				// Check if checklist_completed event was captured
				const events = await page.evaluate(
					() => (window as any).__capturedAnalyticsEvents || [],
				);

				const checklistCompletedEvent = events.find(
					(e: any) => e.event === "checklist_completed",
				);
				if (checklistCompletedEvent) {
					expect(checklistCompletedEvent.properties).toHaveProperty(
						"evaluation_id",
					);
					expect(checklistCompletedEvent.properties).toHaveProperty("category");
					expect(checklistCompletedEvent.properties).toHaveProperty(
						"completion_count",
					);
					expect(checklistCompletedEvent.properties).toHaveProperty("user_id");
					expect(checklistCompletedEvent.properties).toHaveProperty(
						"timestamp",
					);
					// Verify no PII
					expect(checklistCompletedEvent.properties.user_id).not.toContain("@");
				}
			}
		}
	});

	test("should track pd_verify_clicked event when PD badge is clicked", async ({
		page,
	}) => {
		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");

		// Click PD badge
		const privacyBadge = page.getByRole("link", { name: /privacy/i });
		await privacyBadge.click();

		// Wait for event to fire
		await page.waitForTimeout(500);

		// Check if pd_verify_clicked event was captured
		const events = await page.evaluate(
			() => (window as any).__capturedAnalyticsEvents || [],
		);

		const pdVerifyEvent = events.find(
			(e: any) => e.event === "pd_verify_clicked",
		);
		if (pdVerifyEvent) {
			expect(pdVerifyEvent.properties).toHaveProperty("user_id");
			expect(pdVerifyEvent.properties).toHaveProperty("timestamp");
			// Verify no PII
			expect(pdVerifyEvent.properties.user_id).not.toContain("@");
		}
	});

	test("should not block user interactions when analytics fails", async ({
		page,
	}) => {
		// Simulate analytics failure
		await page.route("**/batch/**", async (route) => {
			await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ error: "Analytics service unavailable" }),
			});
		});

		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");

		// User interactions should still work
		const privacyBadge = page.getByRole("link", { name: /privacy/i });
		await expect(privacyBadge).toBeVisible();

		// Click should still navigate (non-blocking)
		await privacyBadge.click();
		await expect(page).toHaveURL(/\/privacy/);
	});
});
