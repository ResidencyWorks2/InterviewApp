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

		// At runtime, if env vars are missing, return a placeholder client
		// This prevents the app from crashing, but operations will fail gracefully
		console.warn(
			"Supabase client initialized without credentials. Some features may not work.",
		);
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
