"use client";

import * as React from "react";

/**
 * PrivacyCopy Component
 *
 * Displays brief privacy and data protection information to build user trust.
 * Shows 2-3 lines of generic trust-building text that is concise and non-intrusive.
 *
 * @returns React component
 */
export function PrivacyCopy() {
	return (
		<section
			aria-label="Privacy and data protection information"
			className="text-xs sm:text-sm text-muted-foreground text-center px-4 py-2"
		>
			<p className="leading-relaxed">
				Your data is encrypted and secure. We protect your personal information
				and never share it with third parties.
			</p>
		</section>
	);
}
