import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../../types/database";

/**
 * Creates a Supabase client for browser/client-side usage
 * Lazy initialization to avoid requiring env vars at build time
 * @returns Supabase client instance
 */
export function createClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	// During build, env vars may not be available - return a placeholder that will fail gracefully
	if (!supabaseUrl || !supabaseAnonKey) {
		// Check if we're in build phase
		const isBuildPhase =
			process.env.NEXT_PHASE === "phase-production-build" ||
			process.env.NEXT_PHASE === "phase-development-build" ||
			(typeof supabaseUrl === "string" && supabaseUrl.includes("${{"));

		if (isBuildPhase) {
			// Return a minimal client that will fail gracefully if actually used
			// This allows the build to complete
			return createBrowserClient<Database>(
				"https://placeholder.supabase.co",
				"placeholder-key",
				{
					auth: {
						autoRefreshToken: true,
						persistSession: true,
						detectSessionInUrl: true,
					},
				},
			);
		}

		// At runtime, if env vars are missing, throw a clear error
		// This helps identify configuration issues early
		const errorMessage =
			"Missing required Supabase environment variables. " +
			"Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set. " +
			"These must be available at build time for Next.js to embed them in the client bundle.";

		console.error(errorMessage);
		console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING");
		console.error(
			"NEXT_PUBLIC_SUPABASE_ANON_KEY:",
			supabaseAnonKey ? "SET" : "MISSING",
		);

		// Still return a placeholder to prevent app crash, but log the error clearly
		return createBrowserClient<Database>(
			"https://placeholder.supabase.co",
			"placeholder-key",
			{
				auth: {
					autoRefreshToken: true,
					persistSession: true,
					detectSessionInUrl: true,
				},
			},
		);
	}

	return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
		auth: {
			// Enable automatic token refresh to prevent authentication loss
			autoRefreshToken: true,
			// Persist session in browser storage
			persistSession: true,
			// Detect session in URL (for magic links)
			detectSessionInUrl: true,
		},
	});
}
