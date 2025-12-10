"use client";

import { AlertCircle, CheckCircle, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserProfile } from "@/components/auth/UserProfile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/features/auth/application/services/auth-service";
import { useAuth } from "@/hooks/useAuth";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";

/**
 * Profile page component
 * Displays user profile information and allows editing
 * Shows a prominent module if mandatory profile details are missing
 */
export default function ProfilePage() {
	const { user, loading: authLoading } = useAuth();
	const router = useRouter();
	const profileCompletion = useProfileCompletion(user);

	const [completionFormData, setCompletionFormData] = useState({
		full_name: user?.user_metadata?.full_name || "",
	});
	const [completionLoading, setCompletionLoading] = useState(false);
	const [completionError, setCompletionError] = useState<string | null>(null);
	const [completionSuccess, setCompletionSuccess] = useState(false);

	// Show loading state while checking authentication
	if (authLoading || profileCompletion.loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
					<p className="mt-4 text-muted-foreground">Loading profile...</p>
				</div>
			</div>
		);
	}

	// Redirect to login if no user (should be handled by layout, but safety check)
	if (!user) {
		router.push("/login");
		return null;
	}

	const handleCompletionInputChange = (field: string, value: string) => {
		setCompletionFormData((prev) => ({
			...prev,
			[field]: value,
		}));
		setCompletionError(null);
	};

	const handleCompletionSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setCompletionLoading(true);
		setCompletionError(null);

		try {
			if (!user?.id) {
				throw new Error("User ID is required");
			}

			const updatedUser = await authService.updateProfile({
				full_name: completionFormData.full_name.trim(),
			});

			if (!updatedUser) {
				throw new Error("Failed to update user profile");
			}

			setCompletionSuccess(true);

			// Force a page reload to trigger proxy re-evaluation and refresh profile completion status
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (error) {
			console.error("Error updating profile:", error);
			setCompletionError(
				error instanceof Error ? error.message : "Failed to update profile",
			);
		} finally {
			setCompletionLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Page Header */}
				<div>
					<h1 className="text-3xl font-bold text-foreground">Profile</h1>
					<p className="text-muted-foreground mt-1">
						Manage your profile information and preferences
					</p>
				</div>

				{/* Profile Completion Module - Show if profile is incomplete */}
				{!profileCompletion.isComplete && (
					<Alert
						variant="default"
						className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20"
					>
						<AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
						<AlertTitle className="text-yellow-900 dark:text-yellow-100">
							Complete Your Profile
						</AlertTitle>
						<AlertDescription className="text-yellow-800 dark:text-yellow-200 mt-2">
							{profileCompletion.missingFields.length > 0 && (
								<p className="mb-4">
									Please complete the following mandatory fields to continue:
								</p>
							)}
							{completionSuccess ? (
								<div className="flex items-center gap-2 text-green-700 dark:text-green-300">
									<CheckCircle className="h-5 w-5" />
									<span>Profile updated successfully! Reloading...</span>
								</div>
							) : (
								<Card className="mt-4 border-yellow-300 dark:border-yellow-800">
									<CardContent className="pt-6">
										<form
											onSubmit={handleCompletionSubmit}
											className="space-y-4"
										>
											{/* Full Name Field */}
											{profileCompletion.missingFields.includes(
												"Full Name",
											) && (
												<div className="space-y-2">
													<Label
														htmlFor="completion-full-name"
														className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100"
													>
														<UserIcon className="h-4 w-4" />
														Full Name <span className="text-red-500">*</span>
													</Label>
													<Input
														id="completion-full-name"
														type="text"
														value={completionFormData.full_name}
														onChange={(e) =>
															handleCompletionInputChange(
																"full_name",
																e.target.value,
															)
														}
														placeholder="Enter your full name"
														required
														className="bg-background"
													/>
													<p className="text-xs text-yellow-700 dark:text-yellow-300">
														This field is required to access all features
													</p>
												</div>
											)}

											{/* Error message */}
											{completionError && (
												<Alert variant="destructive">
													<AlertDescription>{completionError}</AlertDescription>
												</Alert>
											)}

											{/* Submit button */}
											<Button
												type="submit"
												className="w-full"
												disabled={
													completionLoading ||
													!completionFormData.full_name.trim()
												}
											>
												{completionLoading
													? "Updating Profile..."
													: "Complete Profile"}
											</Button>
										</form>
									</CardContent>
								</Card>
							)}
						</AlertDescription>
					</Alert>
				)}

				{/* Profile Completion Status - Show if complete */}
				{profileCompletion.isComplete && (
					<Alert
						variant="default"
						className="border-green-500/50 bg-green-50 dark:bg-green-950/20"
					>
						<CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
						<AlertTitle className="text-green-900 dark:text-green-100">
							Profile Complete
						</AlertTitle>
						<AlertDescription className="text-green-800 dark:text-green-200">
							Your profile is complete. You can update your information below.
						</AlertDescription>
					</Alert>
				)}

				{/* User Profile Component */}
				<UserProfile />
			</div>
		</div>
	);
}
