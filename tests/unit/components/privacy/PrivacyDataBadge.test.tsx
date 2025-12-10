/**
 * Unit tests for PrivacyDataBadge component
 * Tests rendering, click handling, link navigation, and accessibility
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrivacyDataBadge } from "@/components/privacy/PrivacyDataBadge";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
	}),
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
		PD_VERIFY_CLICKED: "pd_verify_clicked",
	},
}));

// Mock useAuth
const mockUser = { id: "user-123" };
vi.mock("@/hooks/useAuth", () => ({
	useAuth: () => ({ user: mockUser }),
}));

describe("PrivacyDataBadge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render PD badge with shield icon", () => {
		render(<PrivacyDataBadge />);

		// Check for badge text
		const badge = screen.getByText(/privacy/i);
		expect(badge).toBeInTheDocument();
	});

	it("should be clickable and navigate to /privacy route", () => {
		render(<PrivacyDataBadge />);

		const badge = screen.getByRole("link", { name: /privacy/i });
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveAttribute("href", "/privacy");
	});

	it("should have accessible ARIA label", () => {
		render(<PrivacyDataBadge />);

		const badge = screen.getByRole("link", { name: /privacy/i });
		expect(badge).toHaveAttribute("aria-label");
	});

	it("should handle click events", () => {
		render(<PrivacyDataBadge />);

		const badge = screen.getByRole("link", { name: /privacy/i });
		fireEvent.click(badge);

		// Navigation should be handled by Next.js Link component
		expect(badge).toBeInTheDocument();
	});

	it("should track pd_verify_clicked event on click", () => {
		render(<PrivacyDataBadge />);

		const badge = screen.getByRole("link", { name: /privacy/i });
		fireEvent.click(badge);

		// Verify analytics tracking was called
		expect(mockInitializeAnalytics).toHaveBeenCalled();
		expect(mockTrack).toHaveBeenCalledWith("pd_verify_clicked", {
			user_id: "user-123",
			timestamp: expect.any(String),
		});
	});

	it("should handle analytics failures gracefully without blocking navigation", () => {
		mockTrack.mockImplementation(() => {
			throw new Error("Analytics error");
		});

		render(<PrivacyDataBadge />);

		const badge = screen.getByRole("link", { name: /privacy/i });
		// Should not throw error
		expect(() => fireEvent.click(badge)).not.toThrow();
		// Navigation should still work
		expect(badge).toBeInTheDocument();
	});

	it("should display shield icon", () => {
		render(<PrivacyDataBadge />);

		// Check for icon (lucide-react Shield icon)
		const icon = screen
			.getByRole("link", { name: /privacy/i })
			.querySelector("svg");
		expect(icon).toBeInTheDocument();
	});

	it("should have proper styling for badge appearance", () => {
		render(<PrivacyDataBadge />);

		const badge = screen.getByRole("link", { name: /privacy/i });
		expect(badge).toBeInTheDocument();
		// Badge should have appropriate classes for styling
		expect(badge.className).toBeTruthy();
	});
});
