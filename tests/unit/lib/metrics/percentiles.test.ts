/**
 * Unit tests for metrics percentile utilities
 */

import { describe, expect, it } from "vitest";
import {
	calculatePercentile,
	calculateStats,
	formatStats,
	type PerformanceStats,
} from "@/lib/metrics/percentiles";

describe("percentiles", () => {
	describe("calculatePercentile", () => {
		it("should return 0 for empty array", () => {
			expect(calculatePercentile([], 50)).toBe(0);
		});

		it("should calculate median (p50)", () => {
			const values = [1, 2, 3, 4, 5];
			expect(calculatePercentile(values, 50)).toBe(3);
		});

		it("should calculate p95", () => {
			const values = Array.from({ length: 100 }, (_, i) => i + 1);
			expect(calculatePercentile(values, 95)).toBe(95);
		});

		it("should calculate p99", () => {
			const values = Array.from({ length: 100 }, (_, i) => i + 1);
			expect(calculatePercentile(values, 99)).toBe(99);
		});

		it("should handle single value", () => {
			expect(calculatePercentile([42], 50)).toBe(42);
			expect(calculatePercentile([42], 95)).toBe(42);
		});

		it("should handle unsorted array", () => {
			const values = [5, 2, 8, 1, 9, 3];
			// Sorted: [1, 2, 3, 5, 8, 9], p50 index = ceil(0.5 * 6) - 1 = 3 - 1 = 2
			expect(calculatePercentile(values, 50)).toBe(3);
		});

		it("should handle duplicate values", () => {
			const values = [1, 2, 2, 3, 3, 3, 4];
			expect(calculatePercentile(values, 50)).toBe(3);
		});

		it("should handle percentile 0", () => {
			const values = [1, 2, 3, 4, 5];
			expect(calculatePercentile(values, 0)).toBe(1);
		});

		it("should handle percentile 100", () => {
			const values = [1, 2, 3, 4, 5];
			expect(calculatePercentile(values, 100)).toBe(5);
		});

		it("should handle negative values", () => {
			const values = [-5, -2, 0, 3, 7];
			expect(calculatePercentile(values, 50)).toBe(0);
		});

		it("should handle decimal values", () => {
			const values = [1.5, 2.3, 3.7, 4.1, 5.9];
			expect(calculatePercentile(values, 50)).toBe(3.7);
		});
	});

	describe("calculateStats", () => {
		it("should return zeros for empty array", () => {
			const stats = calculateStats([]);

			expect(stats.count).toBe(0);
			expect(stats.min).toBe(0);
			expect(stats.max).toBe(0);
			expect(stats.mean).toBe(0);
			expect(stats.median).toBe(0);
			expect(stats.sum).toBe(0);
		});

		it("should calculate all statistics correctly", () => {
			const values = [10, 20, 30, 40, 50];
			const stats = calculateStats(values);

			expect(stats.count).toBe(5);
			expect(stats.min).toBe(10);
			expect(stats.max).toBe(50);
			expect(stats.mean).toBe(30);
			expect(stats.median).toBe(30);
			expect(stats.p50).toBe(30);
			expect(stats.p95).toBe(50);
			expect(stats.p99).toBe(50);
			expect(stats.sum).toBe(150);
		});

		it("should calculate p95 and p99 correctly", () => {
			const values = Array.from({ length: 100 }, (_, i) => i + 1);
			const stats = calculateStats(values);

			expect(stats.p95).toBe(95);
			expect(stats.p99).toBe(99);
		});

		it("should handle single value", () => {
			const stats = calculateStats([42]);

			expect(stats.count).toBe(1);
			expect(stats.min).toBe(42);
			expect(stats.max).toBe(42);
			expect(stats.mean).toBe(42);
			expect(stats.median).toBe(42);
			expect(stats.sum).toBe(42);
		});

		it("should calculate mean correctly for uneven sum", () => {
			const values = [1, 2, 3];
			const stats = calculateStats(values);

			expect(stats.mean).toBe(2);
			expect(stats.sum).toBe(6);
		});

		it("should not mutate input array", () => {
			const values = [5, 2, 8, 1];
			const original = [...values];
			calculateStats(values);

			expect(values).toEqual(original);
		});

		it("should handle large arrays", () => {
			const values = Array.from({ length: 1000 }, () =>
				Math.floor(Math.random() * 1000),
			);
			const stats = calculateStats(values);

			expect(stats.count).toBe(1000);
			expect(stats.min).toBeGreaterThanOrEqual(0);
			expect(stats.max).toBeLessThan(1000);
			expect(stats.p95).toBeDefined();
			expect(stats.p99).toBeDefined();
		});
	});

	describe("formatStats", () => {
		it("should format stats with default unit", () => {
			const stats: PerformanceStats = {
				count: 10,
				min: 5,
				max: 50,
				mean: 25,
				median: 20,
				p50: 20,
				p95: 45,
				p99: 49,
				sum: 250,
			};

			const formatted = formatStats(stats);
			expect(formatted).toContain("Count: 10");
			expect(formatted).toContain("Min: 5.00ms");
			expect(formatted).toContain("Max: 50.00ms");
			expect(formatted).toContain("Mean: 25.00ms");
			expect(formatted).toContain("p95: 45.00ms");
		});

		it("should format stats with custom unit", () => {
			const stats: PerformanceStats = {
				count: 5,
				min: 100,
				max: 500,
				mean: 300,
				median: 300,
				p50: 300,
				p95: 450,
				p99: 490,
				sum: 1500,
			};

			const formatted = formatStats(stats, "bytes");
			expect(formatted).toContain("Min: 100.00bytes");
			expect(formatted).toContain("Max: 500.00bytes");
		});

		it("should include all statistics in formatted output", () => {
			const stats: PerformanceStats = {
				count: 1,
				min: 10,
				max: 10,
				mean: 10,
				median: 10,
				p50: 10,
				p95: 10,
				p99: 10,
				sum: 10,
			};

			const formatted = formatStats(stats);
			expect(formatted).toContain("Count: 1");
			expect(formatted).toContain("Min: 10.00ms");
			expect(formatted).toContain("Max: 10.00ms");
			expect(formatted).toContain("Mean: 10.00ms");
			expect(formatted).toContain("Median (p50): 10.00ms");
			expect(formatted).toContain("p95: 10.00ms");
			expect(formatted).toContain("p99: 10.00ms");
		});

		it("should format decimal values correctly", () => {
			const stats: PerformanceStats = {
				count: 3,
				min: 1.234,
				max: 9.876,
				mean: 5.555,
				median: 5.5,
				p50: 5.5,
				p95: 9.8,
				p99: 9.87,
				sum: 16.665,
			};

			const formatted = formatStats(stats);
			expect(formatted).toContain("Min: 1.23ms");
			expect(formatted).toContain("Max: 9.88ms");
			expect(formatted).toContain("Mean: 5.55ms");
			expect(formatted).toContain("Median (p50): 5.50ms");
			expect(formatted).toContain("p95: 9.80ms");
		});
	});
});
