/**
 * Unit tests for shared utility functions
 */

import { describe, expect, it } from "vitest";
import { cn } from "@/shared/utils";

describe("cn utility function", () => {
	it("should merge class names", () => {
		const result = cn("class1", "class2");
		expect(result).toContain("class1");
		expect(result).toContain("class2");
	});

	it("should handle conditional classes", () => {
		const condition = true;
		const result = cn("base", condition && "conditional");
		expect(result).toContain("base");
		expect(result).toContain("conditional");
	});

	it("should exclude falsy conditional classes", () => {
		const condition = false;
		const result = cn("base", condition && "conditional");
		expect(result).toContain("base");
		expect(result).not.toContain("conditional");
	});

	it("should merge Tailwind classes and deduplicate", () => {
		const result = cn("px-4 py-2", "px-8");
		// tailwind-merge should deduplicate px-4 and px-8, keeping px-8
		expect(result).not.toContain("px-4");
		expect(result).toContain("px-8");
		expect(result).toContain("py-2");
	});

	it("should handle empty input", () => {
		const result = cn();
		expect(result).toBe("");
	});

	it("should handle undefined and null values", () => {
		const result = cn("base", undefined, null, "valid");
		expect(result).toContain("base");
		expect(result).toContain("valid");
	});

	it("should handle array of classes", () => {
		const result = cn(["class1", "class2"], "class3");
		expect(result).toContain("class1");
		expect(result).toContain("class2");
		expect(result).toContain("class3");
	});

	it("should handle object-based conditional classes", () => {
		const result = cn({
			base: true,
			active: true,
			disabled: false,
		});
		expect(result).toContain("base");
		expect(result).toContain("active");
		expect(result).not.toContain("disabled");
	});
});
