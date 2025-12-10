"use client";

import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

/**
 * Privacy Policy Page
 *
 * Displays privacy and data protection information.
 * Provides users with information about how their data is handled.
 *
 * @returns React component
 */
export default function PrivacyPage() {
	return (
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold text-foreground">
						Privacy & Data Protection
					</h1>
					<Link href="/dashboard">
						<Button variant="outline">Back to Dashboard</Button>
					</Link>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Your Privacy Matters</CardTitle>
						<CardDescription>
							We are committed to protecting your personal information and
							interview practice data.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<section>
							<h2 className="text-xl font-semibold mb-2">Data Security</h2>
							<p className="text-muted-foreground">
								Your data is encrypted and secure. We use industry-standard
								encryption to protect your personal information and interview
								responses.
							</p>
						</section>

						<section>
							<h2 className="text-xl font-semibold mb-2">
								Data Sharing Policy
							</h2>
							<p className="text-muted-foreground">
								We never share your personal information or interview responses
								with third parties. Your data is used solely to provide you with
								interview preparation services.
							</p>
						</section>

						<section>
							<h2 className="text-xl font-semibold mb-2">Your Rights</h2>
							<p className="text-muted-foreground">
								You have the right to access, update, or delete your personal
								information at any time. Contact us if you have any questions
								about your data.
							</p>
						</section>

						<div className="pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								Last updated: {new Date().toLocaleDateString()}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
