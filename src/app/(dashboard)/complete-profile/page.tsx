"use client";

import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import { useAuth } from "@/hooks/useAuth";

export default function CompleteProfilePage() {
	const { user } = useAuth();

	// Note: Authentication and profile completion routing is handled by proxy
	// No client-side redirects needed

	if (!user) {
		return null;
	}

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<CompleteProfileForm user={user} showCard={true} />
		</div>
	);
}
