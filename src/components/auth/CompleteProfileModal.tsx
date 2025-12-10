"use client";

import type { AuthUser } from "@supabase/supabase-js";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { CompleteProfileForm } from "./CompleteProfileForm";

interface CompleteProfileModalProps {
	open: boolean;
	onOpenChange?: (open: boolean) => void;
	user: AuthUser | null;
	onSuccess?: () => void;
}

/**
 * Modal component for completing user profile
 * Automatically shows when profile is incomplete
 * Not dismissible by default (until profile is complete)
 */
export function CompleteProfileModal({
	open,
	onOpenChange,
	user,
	onSuccess,
}: CompleteProfileModalProps) {
	if (!user) {
		return null;
	}

	const handleSuccess = () => {
		console.log("CompleteProfileModal: handleSuccess called");

		// Wait a moment to ensure success message is visible before closing
		// The form already waits 1.5s before calling this, so we add another 1s
		// This gives users 2.5s total to see the success confirmation
		setTimeout(() => {
			if (onSuccess) {
				console.log("CompleteProfileModal: Calling onSuccess callback");
				onSuccess();
			} else {
				// Close modal and reload page after a short delay
				if (onOpenChange) {
					console.log("CompleteProfileModal: Closing modal");
					onOpenChange(false);
				}
				setTimeout(() => {
					console.log("CompleteProfileModal: Reloading page");
					window.location.reload();
				}, 300);
			}
		}, 1000); // Additional 1s delay to ensure success message is visible
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange} modal={true}>
			<DialogContent
				className="sm:max-w-[500px]"
				// Prevent closing by clicking outside or pressing ESC when profile is incomplete
				onInteractOutside={(e) => {
					e.preventDefault();
				}}
				onEscapeKeyDown={(e) => {
					e.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>Complete Your Profile</DialogTitle>
					<DialogDescription>
						Please provide your name to get started with your interview
						preparation journey.
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4">
					<CompleteProfileForm
						user={user}
						onSuccess={handleSuccess}
						showCard={false}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
