"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";

/**
 * PostHogProvider wrapper that only initializes PostHog when a valid API key is present
 * Prevents initialization errors when NEXT_PUBLIC_POSTHOG_KEY is missing or empty
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
	// Use useMemo to ensure we only check the env var once per render
	const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

	// Strict validation: key must exist, be non-empty, and not be a placeholder
	const isValidKey =
		posthogKey &&
		typeof posthogKey === "string" &&
		posthogKey.trim().length > 0 &&
		!posthogKey.includes("${{") && // Railway template syntax
		posthogKey !== "placeholder-key" &&
		posthogKey.startsWith("phc_"); // PostHog keys typically start with phc_

	// Only render PostHogProvider if we have a valid key
	// This prevents initialization errors when the key is missing
	if (!isValidKey) {
		if (process.env.NODE_ENV === "development") {
			console.warn(
				"PostHog not initialized: NEXT_PUBLIC_POSTHOG_KEY is not set, is empty, or is invalid",
			);
		}
		return <>{children}</>;
	}

	return (
		<PHProvider
			apiKey={posthogKey.trim()}
			options={{
				api_host: "/ingest",
				ui_host: "https://us.posthog.com",
				capture_exceptions: true,
				debug: process.env.NODE_ENV === "development",
			}}
		>
			{children}
		</PHProvider>
	);
}
