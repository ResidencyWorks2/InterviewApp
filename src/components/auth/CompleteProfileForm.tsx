"use client";

import { CheckCircle, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/features/auth/application/services/auth-service";
import type { AuthUser } from "@/types/auth";

interface CompleteProfileFormProps {
	user: AuthUser;
	onSuccess?: () => void;
	showCard?: boolean;
}

/**
 * Reusable profile completion form component
 * Can be used in a page or modal context
 */
export function CompleteProfileForm({
	user,
	onSuccess,
	showCard = true,
}: CompleteProfileFormProps) {
	const [formData, setFormData] = useState({
		full_name: user?.user_metadata?.full_name || "",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Log state changes for debugging
	useEffect(() => {
		console.log("CompleteProfileForm: State update", {
			loading,
			success,
			error,
			hasUser: !!user,
			userFullName: user?.user_metadata?.full_name,
		});
	}, [loading, success, error, user]);

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
		setError(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(false); // Reset success state

		try {
			if (!user?.id) {
				throw new Error("User ID is required");
			}

			console.log("CompleteProfileForm: Starting profile update", {
				full_name: formData.full_name.trim(),
				userId: user.id,
			});

			const updatedUser = await authService.updateProfile({
				full_name: formData.full_name.trim(),
			});

			console.log("CompleteProfileForm: Profile update response", {
				updatedUser: updatedUser
					? { id: updatedUser.id, hasMetadata: !!updatedUser.user_metadata }
					: null,
			});

			// If updateUser returns null, throw error
			// But don't rely on the returned user having updated metadata immediately
			// as there may be a slight delay in metadata sync
			if (!updatedUser) {
				throw new Error("Failed to update user profile - no user returned");
			}

			// Log the metadata for debugging, but don't fail if it's not immediately updated
			const updatedFullName = updatedUser.user_metadata?.full_name;
			console.log("CompleteProfileForm: Updated user metadata", {
				returnedFullName: updatedFullName,
				expectedFullName: formData.full_name.trim(),
				match: updatedFullName?.trim() === formData.full_name.trim(),
			});

			console.log("CompleteProfileForm: Update successful, setting states");

			// Update both states - React will batch these but that's fine
			// The key is that success=true triggers the early return with success message
			setLoading(false);
			setSuccess(true);

			console.log("CompleteProfileForm: States set, scheduling onSuccess");

			// Call onSuccess callback after showing success message
			// Use requestAnimationFrame to ensure DOM has updated with success message
			requestAnimationFrame(() => {
				setTimeout(() => {
					console.log("CompleteProfileForm: Calling onSuccess callback");
					if (onSuccess) {
						onSuccess();
					} else {
						// Default: reload page after showing success
						setTimeout(() => {
							console.log("CompleteProfileForm: Reloading page");
							window.location.reload();
						}, 1000);
					}
				}, 1500);
			});
		} catch (error) {
			console.error("CompleteProfileForm: Error updating profile", error);
			setError(
				error instanceof Error ? error.message : "Failed to update profile",
			);
			setLoading(false);
			setSuccess(false);
		}
	};

	if (success) {
		return (
			<div className="text-center py-6">
				<CheckCircle className="h-16 w-16 text-green-500 dark:text-green-400 mx-auto mb-4 animate-in fade-in zoom-in duration-300" />
				<h2 className="text-2xl font-bold text-foreground mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
					Profile Complete!
				</h2>
				<p className="text-muted-foreground mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
					Your profile has been successfully updated.
				</p>
				<p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
					Closing in a moment...
				</p>
			</div>
		);
	}

	const formContent = (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Full Name */}
			<div className="space-y-2">
				<Label htmlFor="full_name" className="flex items-center gap-2">
					<UserIcon className="h-4 w-4" />
					Full Name *
				</Label>
				<Input
					id={`full-name-${user?.id}`}
					type="text"
					value={formData.full_name}
					onChange={(e) => handleInputChange("full_name", e.target.value)}
					placeholder="Enter your full name"
					required
				/>
			</div>

			{/* Error message */}
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Submit button */}
			<Button
				type="submit"
				className="w-full"
				disabled={loading || !formData.full_name.trim()}
			>
				{loading ? "Updating Profile..." : "Complete Profile"}
			</Button>
		</form>
	);

	if (showCard) {
		return (
			<Card className="w-full max-w-2xl">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold text-foreground">
						Complete Your Profile
					</CardTitle>
					<CardDescription>
						Please provide your name to get started with your interview
						preparation journey.
					</CardDescription>
				</CardHeader>
				<CardContent>{formContent}</CardContent>
			</Card>
		);
	}

	return formContent;
}
