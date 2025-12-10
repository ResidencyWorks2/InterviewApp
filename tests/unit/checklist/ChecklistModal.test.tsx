/**
 * Unit tests for ChecklistModal component
 * Tests skeleton loader display, analytics events, and error handling
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChecklistModal } from "@/components/drill/ChecklistModal";

// Mock fetch
global.fetch = vi.fn();

// Mock useToast hook
const mockToast = vi.fn();
vi.mock("@/components/ui/toast", () => ({
	useToast: () => ({ toast: mockToast }),
}));

// Mock analytics service
const mockTrack = vi.fn();
const mockInitializeAnalytics = vi.fn();
vi.mock("@/features/notifications/application/analytics", () => ({
	analytics: {
		track: mockTrack,
	},
	initializeAnalytics: mockInitializeAnalytics,
	ANALYTICS_EVENTS: {
		CHECKLIST_OPENED: "checklist_opened",
		CHECKLIST_COMPLETED: "checklist_completed",
	},
}));

// Mock useAuth
const mockUser = { id: "user-123" };
vi.mock("@/hooks/useAuth", () => ({
	useAuth: () => ({ user: mockUser }),
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
		mockTrack.mockClear();
		mockInitializeAnalytics.mockClear();
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

	describe("Analytics Event Tracking", () => {
		it("should track checklist_opened event when modal opens", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ items: [] }),
			} as Response);

			const { rerender } = render(
				<ChecklistModal {...defaultProps} open={false} />,
			);

			// Modal should not track when closed
			expect(mockTrack).not.toHaveBeenCalled();

			// Open modal
			rerender(<ChecklistModal {...defaultProps} open={true} />);

			await waitFor(() => {
				expect(mockInitializeAnalytics).toHaveBeenCalled();
				expect(mockTrack).toHaveBeenCalledWith("checklist_opened", {
					evaluation_id: "eval-123",
					category: "Communication",
					user_id: "user-123",
					timestamp: expect.any(String),
				});
			});
		});

		it("should track checklist_completed event when all items are completed", async () => {
			const mockItems = [
				{
					id: "item-1",
					category: "Communication",
					item_text: "Item 1",
					display_order: 1,
					is_completed: false,
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

			// Mock successful toggle API call
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: mockItems }),
			} as Response);

			render(<ChecklistModal {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Item 1")).toBeInTheDocument();
			});

			// Complete first item
			const item1 = screen.getByText("Item 1").closest("button");
			if (item1) {
				fireEvent.click(item1);
			}

			// Mock successful toggle for second item
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			} as Response);

			// Complete second item (should trigger checklist_completed)
			const item2 = screen.getByText("Item 2").closest("button");
			if (item2) {
				fireEvent.click(item2);
			}

			await waitFor(() => {
				expect(mockTrack).toHaveBeenCalledWith("checklist_completed", {
					evaluation_id: "eval-123",
					category: "Communication",
					completion_count: 2,
					user_id: "user-123",
					timestamp: expect.any(String),
				});
			});
		});

		it("should handle analytics failures gracefully without blocking user interactions", async () => {
			mockTrack.mockImplementation(() => {
				throw new Error("Analytics error");
			});

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ items: [] }),
			} as Response);

			// Should not throw error when opening modal
			expect(() => render(<ChecklistModal {...defaultProps} />)).not.toThrow();

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
			});
		});
	});
});
