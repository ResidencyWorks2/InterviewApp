"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

	// Only render PostHogProvider if we have a valid key
	// This prevents initialization errors when the key is missing
	if (!posthogKey || posthogKey.trim() === "") {
		console.warn(
			"PostHog not initialized: NEXT_PUBLIC_POSTHOG_KEY is not set or is empty",
		);
		return <>{children}</>;
	}

	return (
		<PHProvider
			apiKey={posthogKey}
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
