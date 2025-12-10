/**
 * Unit tests for structure-analysis routes
 */

import { describe, expect, it, vi } from "vitest";
import { GET as getConsistency } from "@/app/api/structure-analysis/[analysisId]/consistency/route";
import { GET as getDuplication } from "@/app/api/structure-analysis/[analysisId]/duplications/[duplicationId]/route";
import { GET as getRecommendation } from "@/app/api/structure-analysis/[analysisId]/recommendations/[recommendationId]/route";
import { GET as getStatus } from "@/app/api/structure-analysis/[analysisId]/status/route";

describe("/api/structure-analysis", () => {
	describe("GET /[analysisId]/consistency", () => {
		it("should return consistency analysis", async () => {
			const request = new Request(
				"http://localhost/api/structure-analysis/123/consistency",
			);
			const params = Promise.resolve({ analysisId: "123" });

			const response = await getConsistency(request, { params });
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.success).toBe(true);
			expect(json.data.analysisId).toBe("123");
			expect(json.data.summary).toBeDefined();
		});
	});

	describe("GET /[analysisId]/duplications/[duplicationId]", () => {
		it("should return duplication details", async () => {
			const request = new Request(
				"http://localhost/api/structure-analysis/123/duplications/dup-456",
			);
			const params = Promise.resolve({
				analysisId: "123",
				duplicationId: "dup-456",
			});

			const response = await getDuplication(request, { params });
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.success).toBe(true);
			expect(json.data.id).toBe("dup-456");
			expect(json.data.analysisId).toBe("123");
			expect(json.data.duplicationType).toBe("implementation");
		});
	});

	describe("GET /[analysisId]/recommendations/[recommendationId]", () => {
		it("should return recommendation details", async () => {
			const request = new Request(
				"http://localhost/api/structure-analysis/123/recommendations/rec-456",
			);
			const params = Promise.resolve({
				analysisId: "123",
				recommendationId: "rec-456",
			});

			const response = await getRecommendation(request, { params });
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.success).toBe(true);
			expect(json.data.id).toBe("rec-456");
			expect(json.data.type).toBe("consolidation");
			expect(json.data.steps).toBeDefined();
		});
	});

	describe("GET /[analysisId]/status", () => {
		it("should return analysis status", async () => {
			const request = new Request(
				"http://localhost/api/structure-analysis/123/status",
			);
			const params = Promise.resolve({ analysisId: "123" });

			const response = await getStatus(request, { params });
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.success).toBe(true);
			expect(json.data.status).toBe("completed");
			expect(json.data.analysisId).toBe("123");
		});
	});
});
