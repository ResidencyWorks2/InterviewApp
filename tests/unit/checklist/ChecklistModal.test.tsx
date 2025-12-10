/**
 * Unit tests for ChecklistModal component
 * Tests skeleton loader display, analytics events, and error handling
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChecklistModal } from "@/components/drill/ChecklistModal";

// Mock fetch
global.fetch = vi.fn();

// Mock useToast hook
const mockToast = vi.fn();
vi.mock("@/components/ui/toast", () => ({
	useToast: () => ({ toast: mockToast }),
}));

describe("ChecklistModal", () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		category: "Communication",
		evaluationId: "eval-123",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(global.fetch as ReturnType<typeof vi.fn>).mockClear();
	});

	describe("Skeleton Loader Display", () => {
		it("should display skeleton loaders while fetching checklist items", async () => {
			// Mock a delayed fetch response
			(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: async () => ({
										items: [
											{
												id: "item-1",
												category: "Communication",
												item_text: "Test item",
												display_order: 1,
												is_completed: false,
											},
										],
									}),
								} as Response),
							100,
						);
					}),
			);

			render(<ChecklistModal {...defaultProps} />);

			// Should show skeleton loaders immediately (check for className pattern)
			const container = screen.getByRole("dialog");
			const skeletons = container.querySelectorAll(".h-12.w-full");
			expect(skeletons.length).toBeGreaterThan(0);

			// Wait for items to load
			await waitFor(() => {
				expect(screen.getByText("Test item")).toBeInTheDocument();
			});
		});

		it("should show 4 skeleton loaders by default", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: async () => ({ items: [] }),
								} as Response),
							50,
						);
					}),
			);

			render(<ChecklistModal {...defaultProps} />);

			// Check for skeleton elements (they use className "h-12 w-full")
			const container = screen.getByRole("dialog");
			const skeletons = container.querySelectorAll(".h-12.w-full");
			expect(skeletons.length).toBe(4);
		});
	});

	describe("Empty State", () => {
		it("should display empty state when no checklist items exist", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ items: [] }),
			} as Response);

			render(<ChecklistModal {...defaultProps} />);

			await waitFor(() => {
				expect(
					screen.getByText("No checklist items available for this category"),
				).toBeInTheDocument();
			});
		});
	});

	describe("Error Handling", () => {
		it("should display error message when fetch fails", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: false,
				status: 500,
				json: async () => ({ error: "Server error" }),
			} as Response);

			render(<ChecklistModal {...defaultProps} />);

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: "Failed to load checklist",
						variant: "destructive",
						action: expect.objectContaining({
							label: "Retry",
						}),
					}),
				);
			});
		});

		it("should handle authentication expiration gracefully", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: false,
				status: 401,
				json: async () => ({
					error: "Your session has expired. Please sign in again.",
				}),
			} as Response);

			render(<ChecklistModal {...defaultProps} />);

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: "Failed to load checklist",
						description: expect.stringContaining("session has expired"),
						variant: "destructive",
					}),
				);
			});
		});
	});

	describe("Checklist Items Display", () => {
		it("should display checklist items when loaded", async () => {
			const mockItems = [
				{
					id: "item-1",
					category: "Communication",
					item_text: "Speak clearly and concisely",
					display_order: 1,
					is_completed: false,
				},
				{
					id: "item-2",
					category: "Communication",
					item_text: "Use specific examples",
					display_order: 2,
					is_completed: true,
				},
			];

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ items: mockItems }),
			} as Response);

			render(<ChecklistModal {...defaultProps} />);

			await waitFor(() => {
				expect(
					screen.getByText("Speak clearly and concisely"),
				).toBeInTheDocument();
				expect(screen.getByText("Use specific examples")).toBeInTheDocument();
			});
		});

		it("should show progress indicator with correct counts", async () => {
			const mockItems = [
				{
					id: "item-1",
					category: "Communication",
					item_text: "Item 1",
					display_order: 1,
					is_completed: true,
				},
				{
					id: "item-2",
					category: "Communication",
					item_text: "Item 2",
					display_order: 2,
					is_completed: false,
				},
			];

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ items: mockItems }),
			} as Response);

			render(<ChecklistModal {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("1 / 2 completed")).toBeInTheDocument();
			});
		});
	});
});
