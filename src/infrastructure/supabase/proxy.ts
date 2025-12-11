import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "../../types/database";

/**
 * Creates a Supabase client for proxy usage (Edge Runtime compatible)
 * Lazy initialization to avoid requiring env vars at build time
 * @param request - The Next.js request object
 * @param response - The Next.js response object
 * @returns Supabase server client instance
 */
export function createClient(request: NextRequest, response: NextResponse) {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	// During build, env vars may not be available - validate before creating client
	if (!supabaseUrl || !supabaseAnonKey) {
		// Check if we're in build phase
		const isBuildPhase =
			process.env.NEXT_PHASE === "phase-production-build" ||
			process.env.NEXT_PHASE === "phase-development-build" ||
			(typeof supabaseUrl === "string" && supabaseUrl.includes("${{"));

		if (isBuildPhase) {
			// Return a minimal client that will fail gracefully if actually used
			// This allows the build to complete
			return createServerClient<Database>(
				"https://placeholder.supabase.co",
				"placeholder-key",
				{
					cookies: {
						getAll() {
							return request.cookies.getAll();
						},
						setAll(cookiesToSet) {
							cookiesToSet.forEach(({ name, value, options }) => {
								response.cookies.set(name, value, options);
							});
						},
					},
				},
			);
		}

		throw new Error(
			"Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
		);
	}

	return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					response.cookies.set(name, value, options);
				});
			},
		},
	});
}
