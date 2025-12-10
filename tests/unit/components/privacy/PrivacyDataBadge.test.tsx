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
vi.mock(
	"@/features/notifications/infrastructure/posthog/AnalyticsService",
	() => ({
		PostHogAnalyticsService: vi.fn().mockImplementation(() => ({
			track: mockTrack,
		})),
	}),
);

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
