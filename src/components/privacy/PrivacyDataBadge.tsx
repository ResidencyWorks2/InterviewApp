"use client";

import { Shield } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
	ANALYTICS_EVENTS,
	analytics,
	initializeAnalytics,
} from "@/features/notifications/application/analytics";
import { useAuth } from "@/hooks/useAuth";

/**
 * PrivacyDataBadge Component
 *
 * Displays a clickable PD (Privacy/Data Protection) badge that links to the privacy policy.
 * Features:
 * - Shield icon with "Privacy" text
 * - Links to `/privacy` route with fallback handling
 * - Accessible with proper ARIA labels
 * - Tracks `pd_verify_clicked` analytics event on click
 *
 * @returns React component
 */
export function PrivacyDataBadge() {
	const { user } = useAuth();

	const handleClick = React.useCallback(() => {
		try {
			initializeAnalytics();
			analytics.track(ANALYTICS_EVENTS.PD_VERIFY_CLICKED, {
				user_id: user?.id || "anonymous",
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			// Analytics failures should not block navigation
			console.error("Failed to track pd_verify_clicked event:", error);
		}
	}, [user]);

	return (
		<Link
			href="/privacy"
			aria-label="View privacy and data protection policy"
			className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
			onClick={handleClick}
		>
			<Shield className="h-4 w-4" aria-hidden="true" />
			<span>Privacy</span>
		</Link>
	);
}
