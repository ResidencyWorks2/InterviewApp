/**
 * Worker entrypoint that ensures environment variables are loaded before any other imports
 */

// Load environment variables FIRST, before any other imports
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/**
 * Simple .env file parser that works with ESM
 * Parses KEY=VALUE lines and sets process.env
 */
function loadEnvFile(filePath: string): void {
	if (!existsSync(filePath)) {
		return;
	}

	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	for (const line of lines) {
		// Skip empty lines and comments
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		// Parse KEY=VALUE
		const equalIndex = trimmed.indexOf("=");
		if (equalIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, equalIndex).trim();
		let value = trimmed.slice(equalIndex + 1).trim();

		// Remove quotes if present
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		// Only set if not already set (environment variables take precedence)
		if (key && !process.env[key]) {
			process.env[key] = value;
		}
	}

	// Debug: Log how many variables were loaded
	const loadedCount = Object.keys(process.env).length;
	console.log(
		`[worker-entrypoint] Environment file parsed. Total env vars: ${loadedCount}`,
	);
}

// Only load .env.local in development or if the file exists
// In production (Railway, etc.), environment variables are set directly
const isDevelopment = process.env.NODE_ENV !== "production";

// Resolve .env.local path relative to current working directory (project root)
// This works whether running from source or bundled dist/worker.js
const envFilePath = resolve(process.cwd(), ".env.local");

console.log(`[worker-entrypoint] Checking for .env.local at: ${envFilePath}`);
console.log(`[worker-entrypoint] File exists: ${existsSync(envFilePath)}`);
console.log(`[worker-entrypoint] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[worker-entrypoint] isDevelopment: ${isDevelopment}`);

if (isDevelopment || existsSync(envFilePath)) {
	if (existsSync(envFilePath)) {
		const beforeCount = Object.keys(process.env).length;
		loadEnvFile(envFilePath);
		const afterCount = Object.keys(process.env).length;
		console.log(
			`[worker-entrypoint] Loaded environment variables from ${envFilePath}`,
		);
		console.log(
			`[worker-entrypoint] Added ${afterCount - beforeCount} new environment variables`,
		);
		// Debug: Check if required vars are now set
		console.log(
			`[worker-entrypoint] NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT SET"}`,
		);
		console.log(
			`[worker-entrypoint] NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT SET"}`,
		);
		console.log(
			`[worker-entrypoint] SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET"}`,
		);
	} else {
		console.log(`[worker-entrypoint] .env.local not found at ${envFilePath}`);
	}
} else {
	console.log(`[worker-entrypoint] Skipping .env.local load (production mode)`);
}

// Use dynamic import to ensure env loading completes before worker imports
// This prevents ESM hoisting from causing issues
// Wrapped in IIFE to avoid top-level await linting issues
(async () => {
	await import("./worker");
})();
