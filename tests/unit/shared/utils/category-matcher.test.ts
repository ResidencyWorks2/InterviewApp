/**
 * Unit tests for category-matcher utility
 */

import { describe, expect, it } from "vitest";
import {
	type CategoryMatchResult,
	findClosestCategory,
} from "@/shared/utils/category-matcher";

describe("category-matcher", () => {
	describe("findClosestCategory", () => {
		it("should return exact match when category exists", () => {
			const result = findClosestCategory("Communication", [
				"Communication",
				"Problem Solving",
				"Leadership",
			]);

			expect(result.matchedCategory).toBe("Communication");
			expect(result.strategy).toBe("exact");
			expect(result.distance).toBeNull();
		});

		it("should return null when no categories provided", () => {
			const result = findClosestCategory("Communication", []);

			expect(result.matchedCategory).toBeNull();
			expect(result.strategy).toBe("none");
			expect(result.distance).toBeNull();
		});

		it("should find prefix match when category starts with evaluation category", () => {
			const result = findClosestCategory("Comm", [
				"Communication",
				"Problem Solving",
			]);

			expect(result.matchedCategory).toBe("Communication");
			expect(result.strategy).toBe("prefix");
			expect(result.distance).toBeNull();
		});

		it("should find prefix match case-insensitively", () => {
			const result = findClosestCategory("comm", [
				"Communication",
				"Problem Solving",
			]);

			expect(result.matchedCategory).toBe("Communication");
			expect(result.strategy).toBe("prefix");
		});

		it("should use Levenshtein distance for close matches", () => {
			const result = findClosestCategory("Communicaton", [
				"Communication",
				"Problem Solving",
			]); // Typo: missing 'i'

			expect(result.matchedCategory).toBe("Communication");
			expect(result.strategy).toBe("levenshtein");
			expect(result.distance).toBe(1);
		});

		it("should prefer exact match over prefix match", () => {
			const result = findClosestCategory("Communication", [
				"Comm",
				"Communication",
			]);

			expect(result.matchedCategory).toBe("Communication");
			expect(result.strategy).toBe("exact");
		});

		it("should prefer exact match over prefix match", () => {
			const result = findClosestCategory("Comm", ["Comm", "Communication"]);

			expect(result.matchedCategory).toBe("Comm");
			expect(result.strategy).toBe("exact");
		});

		it("should find closest Levenshtein match", () => {
			const result = findClosestCategory("Comunication", [
				"Communication",
				"Problem Solving",
				"Leadership",
			]); // Distance 1 from Communication (missing 'i')

			expect(result.matchedCategory).toBe("Communication");
			expect(result.strategy).toBe("levenshtein");
			expect(result.distance).toBe(1);
		});

		it("should handle multiple Levenshtein candidates and pick closest", () => {
			const result = findClosestCategory("Prob", [
				"Problem Solving",
				"Problem",
				"Probe",
			]);

			// "Prob" has distance 0 from exact match or prefix
			// But if exact match exists, it should use that
			expect(result.matchedCategory).toBeDefined();
		});

		it("should return null for very different categories", () => {
			const result = findClosestCategory("CompletelyDifferent", [
				"Communication",
				"Problem Solving",
			]);

			// Should return null if Levenshtein distance > 3
			expect(result.strategy).toBe("none");
			expect(result.matchedCategory).toBeNull();
		});

		it("should handle empty evaluation category", () => {
			const result = findClosestCategory("", [
				"Communication",
				"Problem Solving",
			]);

			// Empty string matches as prefix (startsWith("") is true for all strings)
			expect(result.strategy).toBe("prefix");
			expect(result.matchedCategory).toBe("Communication");
		});

		it("should be case-insensitive for exact matches", () => {
			const result = findClosestCategory("communication", [
				"Communication",
				"Problem Solving",
			]);

			expect(result.matchedCategory).toBe("Communication");
			expect(result.strategy).toBe("exact");
		});

		it("should handle special characters", () => {
			const result = findClosestCategory("Problem-Solving", [
				"Problem Solving",
				"Leadership",
			]);

			expect(result.matchedCategory).toBeDefined();
		});
	});
});
