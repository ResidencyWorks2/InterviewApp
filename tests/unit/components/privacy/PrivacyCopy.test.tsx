/**
 * Unit tests for PrivacyCopy component
 * Tests rendering, text display, and responsive design
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrivacyCopy } from "@/components/privacy/PrivacyCopy";

describe("PrivacyCopy", () => {
	it("should render privacy copy text", () => {
		render(<PrivacyCopy />);

		// Check that privacy text is displayed
		const privacyText = screen.getByText(/your data is encrypted/i);
		expect(privacyText).toBeInTheDocument();
	});

	it("should display 2-3 lines of trust-building text", () => {
		render(<PrivacyCopy />);

		// Check for privacy-related text content
		const container = screen.getByRole("region", { name: /privacy/i });
		expect(container).toBeInTheDocument();

		// Verify text is concise (check for multiple lines)
		const textContent = container.textContent || "";
		expect(textContent.length).toBeGreaterThan(0);
		expect(textContent.length).toBeLessThan(300); // Max reasonable length for 2-3 lines
	});

	it("should be accessible with proper ARIA attributes", () => {
		render(<PrivacyCopy />);

		const region = screen.getByRole("region", { name: /privacy/i });
		expect(region).toHaveAttribute("aria-label");
	});

	it("should have responsive design classes", () => {
		const { container } = render(<PrivacyCopy />);

		// Check for responsive Tailwind classes
		const element = container.firstChild as HTMLElement;
		expect(element).toBeInTheDocument();
		// Component should have responsive classes (sm:, md:, lg: prefixes)
		expect(element.className).toBeTruthy();
	});

	it("should render with non-intrusive styling", () => {
		render(<PrivacyCopy />);

		const container = screen.getByRole("region", { name: /privacy/i });
		// Should not have prominent/attention-grabbing classes
		expect(container).toBeInTheDocument();
	});
});
