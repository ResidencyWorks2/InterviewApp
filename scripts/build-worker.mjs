#!/usr/bin/env node
/**
 * Build script for BullMQ worker using esbuild
 * Bundles TypeScript worker into a single JavaScript file for production
 */

import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

try {
	await esbuild.build({
		entryPoints: ["src/infrastructure/bullmq/worker.ts"],
		bundle: true,
		platform: "node",
		target: "node22",
		format: "esm",
		outfile: "dist/worker.js",
		external: [
			// Keep these as external - they'll be in node_modules at runtime
			"@supabase/supabase-js",
			"@supabase/ssr",
			"@sentry/nextjs",
			"bullmq",
			"ioredis",
			"openai",
			"posthog-node",
			"@upstash/redis",
		],
		sourcemap: false,
		minify: false, // Keep readable for debugging
		keepNames: true,
		logLevel: "info",
		tsconfig: "tsconfig.worker.json",
	});

	console.log("✓ Worker bundled successfully to dist/worker.js");
} catch (error) {
	console.error("✗ Worker build failed:", error);
	process.exit(1);
}
