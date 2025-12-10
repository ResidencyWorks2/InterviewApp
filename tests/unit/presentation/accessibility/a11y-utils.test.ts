/**
 * Unit tests for accessibility utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	announce,
	createAccessibleButtonProps,
	createAccessibleFieldProps,
	createScreenReaderText,
	generateAriaLabel,
	getContrastRatio,
	getLuminance,
	handleArrowNavigation,
	handleEscapeKey,
	meetsWCAG,
	restoreFocus,
	trapFocus,
} from "@/presentation/accessibility/a11y-utils";

describe("a11y-utils", () => {
	beforeEach(() => {
		// Setup DOM for browser-based utilities
		document.body.innerHTML = "";
	});

	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	describe("generateAriaLabel", () => {
		it("should generate aria label from text", () => {
			expect(generateAriaLabel("Submit")).toBe("Submit");
		});

		it("should include context when provided", () => {
			expect(generateAriaLabel("Submit", "form")).toBe("Submit, form");
		});

		it("should handle empty context", () => {
			// Empty string is falsy, so it returns just the text
			expect(generateAriaLabel("Submit", "")).toBe("Submit");
		});
	});

	describe("createAccessibleButtonProps", () => {
		it("should create button props with aria-label", () => {
			const props = createAccessibleButtonProps("Click me");

			expect(props["aria-label"]).toBe("Click me");
		});

		it("should include aria-describedby when description provided", () => {
			const props = createAccessibleButtonProps("Click me", "error-id");

			expect(props["aria-label"]).toBe("Click me");
			expect(props["aria-describedby"]).toBe("error-id");
		});

		it("should not include aria-describedby when description missing", () => {
			const props = createAccessibleButtonProps("Click me");

			expect(props["aria-describedby"]).toBeUndefined();
		});
	});

	describe("createAccessibleFieldProps", () => {
		it("should create field props with required flag", () => {
			const props = createAccessibleFieldProps("Email", true);

			expect(props["aria-label"]).toBe("Email");
			expect(props["aria-required"]).toBe(true);
		});

		it("should set aria-required to false when not required", () => {
			const props = createAccessibleFieldProps("Email", false);

			expect(props["aria-required"]).toBe(false);
		});

		it("should include error attributes when error provided", () => {
			const props = createAccessibleFieldProps("Email", true, "Invalid email");

			expect(props["aria-invalid"]).toBe(true);
			expect(props["aria-describedby"]).toBe("Email-error");
		});

		it("should not include error attributes when no error", () => {
			const props = createAccessibleFieldProps("Email", true);

			expect(props["aria-invalid"]).toBeUndefined();
			expect(props["aria-describedby"]).toBeUndefined();
		});
	});

	describe("trapFocus", () => {
		it("should return cleanup function", () => {
			const element = document.createElement("div");
			const cleanup = trapFocus(element);

			expect(typeof cleanup).toBe("function");
			cleanup();
		});

		it("should focus first focusable element", () => {
			const element = document.createElement("div");
			const button = document.createElement("button");
			button.textContent = "Test";
			element.appendChild(button);
			document.body.appendChild(element);

			const focusSpy = vi.spyOn(button, "focus");
			trapFocus(element);

			expect(focusSpy).toHaveBeenCalled();
		});
	});

	describe("restoreFocus", () => {
		it("should focus the provided element", () => {
			const element = document.createElement("button");
			document.body.appendChild(element);

			const focusSpy = vi.spyOn(element, "focus");
			restoreFocus(element);

			expect(focusSpy).toHaveBeenCalled();
		});
	});

	describe("announce", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should create announcement element", () => {
			announce("Test message");

			const announcement = document.querySelector('[aria-live="polite"]');
			expect(announcement).toBeDefined();
			expect(announcement?.textContent).toBe("Test message");
		});

		it("should use assertive priority when specified", () => {
			announce("Urgent message", "assertive");

			const announcement = document.querySelector('[aria-live="assertive"]');
			expect(announcement).toBeDefined();
		});

		it("should remove announcement after timeout", () => {
			announce("Test message");

			expect(document.querySelector("[aria-live]")).toBeDefined();

			vi.advanceTimersByTime(1000);

			expect(document.querySelector("[aria-live]")).toBeNull();
		});

		it("should set aria-atomic attribute", () => {
			announce("Test message");

			const announcement = document.querySelector("[aria-live]");
			expect(announcement?.getAttribute("aria-atomic")).toBe("true");
		});
	});

	describe("createScreenReaderText", () => {
		it("should create screen reader only text", () => {
			const text = createScreenReaderText("Hidden text");

			expect(text).toContain('<span class="sr-only">');
			expect(text).toContain("Hidden text");
			expect(text).toContain("</span>");
		});
	});

	describe("handleArrowNavigation", () => {
		it("should navigate down on ArrowDown", () => {
			const items = [
				document.createElement("button"),
				document.createElement("button"),
				document.createElement("button"),
			];
			document.body.appendChild(items[0]);
			document.body.appendChild(items[1]);
			document.body.appendChild(items[2]);
			const focusSpy = vi.spyOn(items[1], "focus");

			const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
			const preventDefaultSpy = vi.spyOn(event, "preventDefault");
			const newIndex = handleArrowNavigation(event, items, 0);

			expect(newIndex).toBe(1);
			expect(focusSpy).toHaveBeenCalled();
			expect(preventDefaultSpy).toHaveBeenCalled();
		});

		it("should navigate up on ArrowUp", () => {
			const items = [
				document.createElement("button"),
				document.createElement("button"),
			];
			const focusSpy = vi.spyOn(items[0], "focus");

			const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
			const newIndex = handleArrowNavigation(event, items, 1);

			expect(newIndex).toBe(0);
			expect(focusSpy).toHaveBeenCalled();
		});

		it("should navigate to first on Home", () => {
			const items = [
				document.createElement("button"),
				document.createElement("button"),
			];
			const focusSpy = vi.spyOn(items[0], "focus");

			const event = new KeyboardEvent("keydown", { key: "Home" });
			const newIndex = handleArrowNavigation(event, items, 1);

			expect(newIndex).toBe(0);
			expect(focusSpy).toHaveBeenCalled();
		});

		it("should navigate to last on End", () => {
			const items = [
				document.createElement("button"),
				document.createElement("button"),
			];
			const focusSpy = vi.spyOn(items[1], "focus");

			const event = new KeyboardEvent("keydown", { key: "End" });
			const newIndex = handleArrowNavigation(event, items, 0);

			expect(newIndex).toBe(1);
			expect(focusSpy).toHaveBeenCalled();
		});

		it("should not navigate past boundaries", () => {
			const items = [document.createElement("button")];

			const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
			const newIndex = handleArrowNavigation(event, items, 0);

			expect(newIndex).toBe(0);
		});

		it("should return current index for unsupported keys", () => {
			const items = [document.createElement("button")];

			const event = new KeyboardEvent("keydown", { key: "Enter" });
			const newIndex = handleArrowNavigation(event, items, 0);

			expect(newIndex).toBe(0);
		});
	});

	describe("handleEscapeKey", () => {
		it("should call onEscape when Escape key pressed", () => {
			const onEscape = vi.fn();
			const event = new KeyboardEvent("keydown", { key: "Escape" });
			const preventDefaultSpy = vi.spyOn(event, "preventDefault");

			handleEscapeKey(event, onEscape);

			expect(onEscape).toHaveBeenCalledOnce();
			expect(preventDefaultSpy).toHaveBeenCalledOnce();
		});

		it("should not call onEscape for other keys", () => {
			const onEscape = vi.fn();
			const event = new KeyboardEvent("keydown", { key: "Enter" });

			handleEscapeKey(event, onEscape);

			expect(onEscape).not.toHaveBeenCalled();
		});
	});

	describe("getLuminance", () => {
		it("should calculate luminance for white", () => {
			expect(getLuminance(255, 255, 255)).toBeCloseTo(1, 3);
		});

		it("should calculate luminance for black", () => {
			expect(getLuminance(0, 0, 0)).toBe(0);
		});

		it("should calculate luminance for gray", () => {
			const grayLum = getLuminance(128, 128, 128);
			expect(grayLum).toBeGreaterThan(0);
			expect(grayLum).toBeLessThan(1);
		});

		it("should handle low values correctly", () => {
			const lum = getLuminance(10, 20, 30);
			expect(lum).toBeGreaterThan(0);
			expect(lum).toBeLessThan(1);
		});
	});

	describe("getContrastRatio", () => {
		it("should return high contrast for black on white", () => {
			const ratio = getContrastRatio([0, 0, 0], [255, 255, 255]);
			expect(ratio).toBeCloseTo(21, 1);
		});

		it("should return low contrast for similar colors", () => {
			const ratio = getContrastRatio([100, 100, 100], [110, 110, 110]);
			expect(ratio).toBeLessThan(2);
		});

		it("should be symmetric", () => {
			const ratio1 = getContrastRatio([0, 0, 0], [255, 255, 255]);
			const ratio2 = getContrastRatio([255, 255, 255], [0, 0, 0]);
			expect(ratio1).toBeCloseTo(ratio2, 1);
		});

		it("should always return >= 1", () => {
			const ratio = getContrastRatio([128, 128, 128], [130, 130, 130]);
			expect(ratio).toBeGreaterThanOrEqual(1);
		});
	});

	describe("meetsWCAG", () => {
		it("should pass AA for black on white", () => {
			expect(meetsWCAG([0, 0, 0], [255, 255, 255], "AA")).toBe(true);
		});

		it("should pass AAA for black on white", () => {
			expect(meetsWCAG([0, 0, 0], [255, 255, 255], "AAA")).toBe(true);
		});

		it("should fail AA for low contrast", () => {
			expect(meetsWCAG([100, 100, 100], [110, 110, 110], "AA")).toBe(false);
		});

		it("should fail AAA when AA passes", () => {
			// A contrast ratio that passes AA (4.5) but fails AAA (7)
			const darkGray: [number, number, number] = [60, 60, 60];
			const lightGray: [number, number, number] = [180, 180, 180];

			expect(meetsWCAG(darkGray, lightGray, "AA")).toBe(true);
			expect(meetsWCAG(darkGray, lightGray, "AAA")).toBe(false);
		});

		it("should default to AA level", () => {
			expect(meetsWCAG([0, 0, 0], [255, 255, 255])).toBe(true);
		});
	});
});
