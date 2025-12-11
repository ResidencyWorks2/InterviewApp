/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present and valid
 */

import { z } from "zod";

/**
 * Helper to create an optional URL field that handles empty strings and invalid values gracefully.
 * This is needed because environment variables from deployment platforms may be set to empty strings,
 * and Zod's `.optional()` only handles `undefined`, not empty strings.
 *
 * Also handles common placeholder values like "undefined", "null", or whitespace-only strings.
 * If a value is provided but is not a valid URL, it will be treated as undefined to allow the build to continue.
 */
const optionalUrl = () => {
	return z.preprocess(
		(val) => {
			// Handle undefined, null, or empty string
			if (val === undefined || val === null || val === "") {
				return undefined;
			}

			const trimmed = String(val).trim();
			const lowercased = trimmed.toLowerCase();

			// Treat empty strings, "undefined", "null", or whitespace-only as undefined
			if (
				trimmed === "" ||
				lowercased === "undefined" ||
				lowercased === "null" ||
				lowercased === "none"
			) {
				return undefined;
			}

			// Validate URL format - if invalid, treat as undefined to allow build to continue
			// This handles cases where deployment platforms might have an invalid URL value set
			try {
				new URL(trimmed);
				return trimmed;
			} catch {
				// Invalid URL format - treat as undefined to prevent build failure
				// The application will fall back to NEXT_PUBLIC_APP_URL or other defaults
				return undefined;
			}
		},
		z.union([z.url(), z.undefined()]),
	);
};

// Define the environment schema
const envSchema = z.object({
	// Development
	DEBUG: z
		.string()
		.default("false")
		.transform((val) => val === "true"),
	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),

	// Authentication
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),

	// Application settings
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	NEXT_PUBLIC_APP_URL: optionalUrl(),
	SYNC_TIMEOUT_MS: z.coerce.number().default(30000),
	RATE_LIMIT_RPM: z.coerce.number().default(60),
	EVALUATION_WEBHOOK_SECRET: z.string().optional(),

	// External services
	OPENAI_API_KEY: z.string().optional(),
	PLAYWRIGHT_BASE_URL: z.url().default("http://localhost:3000"),
	POSTHOG_API_KEY: z.string().optional(),
	POSTHOG_HOST: z.url().default("https://app.posthog.com"),
	SENTRY_DSN: optionalUrl(),
	SENTRY_ORG: z.string().optional(),
	SENTRY_PROJECT: z.string().optional(),
	STRIPE_PUBLISHABLE_KEY: z.string().optional(),
	STRIPE_SECRET_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().optional(),
	STRIPE_PRO_PRICE_ID: z.string().optional(),
	STRIPE_TRIAL_PRICE_ID: z.string().optional(),

	// Supabase
	NEXT_PUBLIC_SUPABASE_URL: z.url({
		message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL",
	}),
	NEXT_PUBLIC_SUPABASE_ANON_KEY: z
		.string()
		.min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
	SUPABASE_URL: optionalUrl(),
	SUPABASE_SERVICE_ROLE_KEY: z
		.string()
		.min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
	SUPABASE_ANON_KEY: z.string().optional(),

	// Redis (Upstash or Railway Redis)
	UPSTASH_REDIS_NATIVE_URL: optionalUrl(),
	UPSTASH_REDIS_REST_URL: optionalUrl(),
	UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

	// Railway provides these automatically when Redis/Postgres services are added
	REDIS_URL: optionalUrl(),
	DATABASE_URL: optionalUrl(),

	// Deployment platform (Railway provides PORT automatically)
	PORT: z.coerce.number().optional(),
});

/**
 * Check if we're in Next.js build phase or if env vars contain unresolved templates
 * During build, environment variables may not be fully resolved (e.g., Railway's ${{shared.VAR}} syntax)
 * We should skip strict validation during build and only validate at runtime
 */
function isBuildPhase(): boolean {
	// Check if env vars contain Railway template syntax (unresolved)
	const hasUnresolvedTemplates = Object.values(process.env).some(
		(val) => typeof val === "string" && val.includes("${{"),
	);

	// NEXT_PHASE is set by Next.js during build
	const isNextBuild =
		process.env.NEXT_PHASE === "phase-production-build" ||
		process.env.NEXT_PHASE === "phase-development-build";

	// If we detect unresolved templates or are in Next.js build phase, skip strict validation
	return hasUnresolvedTemplates || isNextBuild;
}

// Parse and validate environment variables
function validateEnv() {
	// During build phase, use lenient validation to allow build to proceed
	// Railway's ${{shared.VAR}} syntax doesn't resolve during Docker build
	if (isBuildPhase()) {
		try {
			// Use safeParse which doesn't throw, and return partial env with defaults
			const result = envSchema.safeParse(process.env);
			if (result.success) {
				const parsed = result.data;
				// Default SUPABASE_URL to NEXT_PUBLIC_SUPABASE_URL if not provided
				if (!parsed.SUPABASE_URL && parsed.NEXT_PUBLIC_SUPABASE_URL) {
					parsed.SUPABASE_URL = parsed.NEXT_PUBLIC_SUPABASE_URL;
				}
				return parsed;
			}
			// If validation fails during build, return a minimal env object with defaults
			// This allows the build to complete; validation will happen at runtime
			console.warn(
				"[environment] Build-time validation skipped - will validate at runtime",
			);
			return {
				...process.env,
				NODE_ENV:
					(process.env.NODE_ENV as "development" | "production" | "test") ||
					"production",
				NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
				NEXT_PUBLIC_SUPABASE_ANON_KEY:
					process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
				SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
			} as z.infer<typeof envSchema>;
		} catch {
			// Fallback: return minimal env during build
			return {
				...process.env,
				NODE_ENV:
					(process.env.NODE_ENV as "development" | "production" | "test") ||
					"production",
			} as z.infer<typeof envSchema>;
		}
	}

	// At runtime, perform strict validation
	try {
		const parsed = envSchema.parse(process.env);
		// Default SUPABASE_URL to NEXT_PUBLIC_SUPABASE_URL if not provided
		// They are typically the same value, just one is public and one is server-side
		if (!parsed.SUPABASE_URL && parsed.NEXT_PUBLIC_SUPABASE_URL) {
			parsed.SUPABASE_URL = parsed.NEXT_PUBLIC_SUPABASE_URL;
		}
		return parsed;
	} catch (error) {
		if (error instanceof z.ZodError) {
			const missingVars = error.issues.map(
				(err) => `${err.path.join(".")}: ${err.message}`,
			);

			// Debug: Log available environment variables (filtered for security)
			const availableEnvKeys = Object.keys(process.env)
				.filter(
					(key) =>
						key.includes("SUPABASE") ||
						key.includes("REDIS") ||
						key.includes("OPENAI") ||
						key.includes("POSTHOG") ||
						key.includes("SENTRY") ||
						key === "NODE_ENV",
				)
				.sort();

			const debugInfo =
				availableEnvKeys.length > 0
					? `\n\nAvailable environment variables (filtered): ${availableEnvKeys.join(", ")}`
					: "\n\nNo relevant environment variables found in process.env";

			throw new Error(
				`❌ Environment validation failed:\n${missingVars.join("\n")}${debugInfo}\n\nPlease check your environment variables (.env.local for local development, or Railway environment variables for deployment) and ensure all required variables are set correctly.\n\nFor Railway: Ensure variables are set at the SERVICE level (not just project level) for the worker service.`,
			);
		}
		throw error;
	}
}

// Lazy initialization: validate only when accessed, not at module load
let cachedEnv: z.infer<typeof envSchema> | null = null;

/**
 * Get validated environment variables
 * Lazy initialization to avoid requiring env vars at build time
 */
function getEnv(): z.infer<typeof envSchema> {
	if (!cachedEnv) {
		cachedEnv = validateEnv();
	}
	return cachedEnv;
}

// Export validated environment variables (lazy getter)
// Use a Proxy to maintain the same API while deferring validation
export const env = new Proxy({} as z.infer<typeof envSchema>, {
	get(_target, prop) {
		return getEnv()[prop as keyof z.infer<typeof envSchema>];
	},
	ownKeys() {
		return Object.keys(getEnv());
	},
	has(_target, prop) {
		return prop in getEnv();
	},
	getOwnPropertyDescriptor(_target, prop) {
		const env = getEnv();
		return Object.getOwnPropertyDescriptor(env, prop);
	},
});

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;

// Helper function to check if we're in development
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// Helper function to check if external services are configured
export const hasOpenAI = !!env.OPENAI_API_KEY;
export const hasPostHog = !!env.POSTHOG_API_KEY;
export const hasSentry = !!env.SENTRY_DSN;
export const hasStripe = !!env.STRIPE_SECRET_KEY;
export const hasRedis = !!env.UPSTASH_REDIS_REST_URL;
export const hasRedisNative = !!env.UPSTASH_REDIS_NATIVE_URL;
export const hasSupabaseServiceRole = !!env.SUPABASE_SERVICE_ROLE_KEY;

// Helper function to get the correct app URL
export const getAppUrl = (): string => {
	// Priority order: NEXT_PUBLIC_APP_URL > Railway public domain > localhost fallback
	if (env.NEXT_PUBLIC_APP_URL) {
		return env.NEXT_PUBLIC_APP_URL;
	}

	// Railway provides RAILWAY_PUBLIC_DOMAIN automatically for public services
	// Check for Railway environment variable
	if (process.env.RAILWAY_PUBLIC_DOMAIN) {
		return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
	}

	// Fallback to localhost for development
	return "http://localhost:3000";
};

// Helper function to get the app URL for client-side use
export const getClientAppUrl = (): string => {
	// For client-side, we need to use NEXT_PUBLIC_APP_URL or construct from window.location
	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	// Server-side fallback
	return getAppUrl();
};
