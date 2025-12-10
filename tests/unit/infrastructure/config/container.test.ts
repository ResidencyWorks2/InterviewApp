/**
 * Unit tests for app container
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppContainer } from "@/infrastructure/config/container";

// Mock clients
vi.mock("@/infrastructure/config/clients", () => ({
	createSupabaseServerClient: vi.fn(),
	getSupabaseServiceRoleClient: vi.fn(() => null),
	getRedisClient: vi.fn(() => null),
	getPostHogClient: vi.fn(() => null),
	shutdownClients: vi.fn(),
}));

// Mock environment
vi.mock("@/infrastructure/config/environment", () => ({
	env: {
		NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
	},
}));

describe("createAppContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create app container with env and clients", () => {
		const container = createAppContainer();

		expect(container).toBeDefined();
		expect(container.env).toBeDefined();
		expect(container.clients).toBeDefined();
	});

	it("should provide environment configuration", () => {
		const container = createAppContainer();

		expect(container.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
	});

	it("should provide client factories", () => {
		const container = createAppContainer();

		expect(typeof container.clients.getSupabaseServerClient).toBe("function");
		expect(typeof container.clients.getSupabaseServiceRoleClient).toBe(
			"function",
		);
		expect(typeof container.clients.getRedisClient).toBe("function");
		expect(typeof container.clients.getPostHogClient).toBe("function");
		expect(typeof container.clients.shutdown).toBe("function");
	});

	it("should provide shutdown function", async () => {
		const container = createAppContainer();

		// shutdown should be callable and not throw
		await expect(
			Promise.resolve(container.clients.shutdown()),
		).resolves.not.toThrow();
	});
});
