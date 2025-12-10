import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { createClient } from "@/infrastructure/supabase/proxy";

/**
 * Authentication callback handler
 * Processes magic link authentication and redirects users appropriately
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	// Default to dashboard - proxy will handle profile completion redirects
	const next = requestUrl.searchParams.get("next") ?? "/dashboard";

	logger.debug("Auth callback received", {
		component: "auth-callback",
		action: "callback-received",
		metadata: {
			url: requestUrl.toString(),
			hasCode: !!code,
			next,
			params: Object.fromEntries(requestUrl.searchParams),
		},
	});

	if (code) {
		try {
			// Per Supabase SSR best practices: create redirect response FIRST,
			// then pass it to Supabase client so cookies are set directly on the redirect response.
			// The proxy will handle profile completion redirects, so we always redirect to
			// the next param or dashboard.
			const redirectPath = next;
			const redirectResponse = NextResponse.redirect(
				`${requestUrl.origin}${redirectPath}`,
			);

			// Create Supabase client with the redirect response
			// This ensures cookies are set directly on the redirect response
			const supabase = createClient(request, redirectResponse);

			logger.debug("Exchanging code for session", {
				component: "auth-callback",
				action: "exchange-code",
			});

			const { data, error } = await supabase.auth.exchangeCodeForSession(code);

			if (error) {
				logger.error("Auth callback error", error, {
					component: "auth-callback",
					action: "exchange-code",
					metadata: { errorMessage: error.message },
				});
				return NextResponse.redirect(
					`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`,
				);
			}

			logger.info("Session exchanged successfully", {
				component: "auth-callback",
				action: "exchange-code",
				userId: data.user?.id,
				metadata: { hasSession: !!data.session },
			});

			// Cookies have been set directly on redirectResponse by Supabase SSR
			// The proxy middleware will handle profile completion redirects if needed
			logger.debug("Redirecting after successful auth", {
				component: "auth-callback",
				action: "redirect",
				userId: data.user?.id,
				metadata: {
					redirectPath,
					cookieCount: redirectResponse.cookies.getAll().length,
				},
			});

			// Return the redirect response with cookies already set by Supabase SSR
			return redirectResponse;
		} catch (error) {
			const errorObj =
				error instanceof Error ? error : new Error(String(error));
			logger.error("Auth callback exception", errorObj, {
				component: "auth-callback",
				action: "callback-handler",
			});
			return NextResponse.redirect(
				`${requestUrl.origin}/login?error=${encodeURIComponent("Authentication failed")}`,
			);
		}
	}

	// No code parameter - redirect to login
	logger.warn("Auth callback - No code parameter", {
		component: "auth-callback",
		action: "missing-code",
	});
	return NextResponse.redirect(`${requestUrl.origin}/login`);
}
