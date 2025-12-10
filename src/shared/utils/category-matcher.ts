/**
 * Category matching utility for checklist templates
 * Implements the matching algorithm defined in FR-016
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns The Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
	const len1 = str1.length;
	const len2 = str2.length;
	const matrix: number[][] = [];

	// Initialize matrix
	for (let i = 0; i <= len1; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= len2; j++) {
		matrix[0][j] = j;
	}

	// Fill matrix
	for (let i = 1; i <= len1; i++) {
		for (let j = 1; j <= len2; j++) {
			if (str1[i - 1] === str2[j - 1]) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j] + 1, // deletion
					matrix[i][j - 1] + 1, // insertion
					matrix[i - 1][j - 1] + 1, // substitution
				);
			}
		}
	}

	return matrix[len1][len2];
}

export type MatchingStrategy = "exact" | "prefix" | "levenshtein" | "none";

export interface CategoryMatchResult {
	matchedCategory: string | null;
	strategy: MatchingStrategy;
	distance: number | null;
}

/**
 * Find the closest matching category using the algorithm from FR-016
 * @param evaluationCategory The category from the evaluation
 * @param templateCategories Available template categories
 * @returns Match result with category, strategy, and distance
 */
export function findClosestCategory(
	evaluationCategory: string,
	templateCategories: string[],
): CategoryMatchResult {
	const normalizedEvalCategory = evaluationCategory.toLowerCase().trim();

	// Strategy 1: Exact match (case-insensitive)
	for (const templateCategory of templateCategories) {
		if (templateCategory.toLowerCase().trim() === normalizedEvalCategory) {
			return {
				matchedCategory: templateCategory,
				strategy: "exact",
				distance: null,
			};
		}
	}

	// Strategy 2: Prefix match (case-insensitive)
	for (const templateCategory of templateCategories) {
		const normalizedTemplate = templateCategory.toLowerCase().trim();
		if (
			normalizedTemplate.startsWith(normalizedEvalCategory) ||
			normalizedEvalCategory.startsWith(normalizedTemplate)
		) {
			return {
				matchedCategory: templateCategory,
				strategy: "prefix",
				distance: null,
			};
		}
	}

	// Strategy 3: Levenshtein distance (maximum threshold: 3)
	let bestMatch: { category: string; distance: number } | null = null;
	for (const templateCategory of templateCategories) {
		const distance = levenshteinDistance(
			normalizedEvalCategory,
			templateCategory.toLowerCase().trim(),
		);
		if (distance <= 3) {
			if (!bestMatch || distance < bestMatch.distance) {
				bestMatch = { category: templateCategory, distance };
			}
		}
	}

	if (bestMatch) {
		return {
			matchedCategory: bestMatch.category,
			strategy: "levenshtein",
			distance: bestMatch.distance,
		};
	}

	// Strategy 4: Fallback - no match found
	return {
		matchedCategory: null,
		strategy: "none",
		distance: null,
	};
}
