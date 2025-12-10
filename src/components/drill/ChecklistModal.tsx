"use client";

import { CheckCircle2, Circle } from "lucide-react";
import * as React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/shared/utils";

export interface ChecklistItem {
	id: string;
	category: string;
	item_text: string;
	display_order: number;
	is_completed: boolean;
}

export interface ChecklistModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	category: string;
	categoryIcon?: string;
	evaluationId: string;
	items?: ChecklistItem[];
	onItemToggle?: (itemId: string, completed: boolean) => void;
}

/**
 * ChecklistModal Component
 *
 * Displays a modal with coaching checklist items for a specific category.
 * Features:
 * - Fetches checklist items from API when modal opens
 * - Shows skeleton loaders while loading
 * - Displays progress indicator (X / Y completed)
 * - Supports optimistic UI updates with error rollback
 * - Shows toast notifications for errors with retry option
 * - Handles authentication expiration gracefully
 * - Supports long text with automatic wrapping and scrolling
 *
 * @param props - ChecklistModalProps
 * @returns React component
 */
export function ChecklistModal({
	open,
	onOpenChange,
	category,
	categoryIcon,
	evaluationId,
	items = [],
	onItemToggle,
}: ChecklistModalProps) {
	const [checklistItems, setChecklistItems] =
		React.useState<ChecklistItem[]>(items);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const { toast } = useToast();

	// Fetch checklist items when modal opens
	const fetchChecklistItems = React.useCallback(async () => {
		setLoading(true);
		setError(null);

		console.log("🔍 Fetching checklist for:", {
			category,
			evaluationId,
		});

		try {
			const response = await fetch(
				`/api/checklist?category=${encodeURIComponent(category)}&evaluationId=${evaluationId}`,
			);

			if (!response.ok) {
				// Handle authentication expiration
				if (response.status === 401) {
					const data = await response.json().catch(() => ({}));
					const message =
						data.error || "Your session has expired. Please sign in again.";
					throw new Error(message);
				}
				throw new Error("Failed to fetch checklist items");
			}

			const responseData = await response.json();
			console.log("✅ Checklist API response:", responseData);
			// API response is wrapped in { data: { items: [...] }, message, timestamp }
			const items = responseData.data?.items || responseData.items || [];
			setChecklistItems(items);
		} catch (err) {
			console.error("❌ Error fetching checklist:", err);
			const errorMessage =
				err instanceof Error ? err.message : "Failed to load checklist";
			setError(errorMessage);
			toast({
				title: "Failed to load checklist",
				description: errorMessage,
				variant: "destructive",
				action: {
					label: "Retry",
					onClick: () => fetchChecklistItems(),
				},
			});
		} finally {
			setLoading(false);
		}
	}, [category, evaluationId, toast]);

	React.useEffect(() => {
		if (open && evaluationId) {
			fetchChecklistItems();
		}
	}, [open, evaluationId, fetchChecklistItems]);

	const toggleItem = async (itemId: string, currentlyCompleted: boolean) => {
		try {
			const newCompletedState = !currentlyCompleted;

			// Optimistically update UI
			setChecklistItems((prev) =>
				prev.map((item) =>
					item.id === itemId
						? { ...item, is_completed: newCompletedState }
						: item,
				),
			);

			// Call API to persist change
			const response = await fetch("/api/checklist/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					evaluation_id: evaluationId,
					template_id: itemId,
					completed: newCompletedState,
				}),
			});

			if (!response.ok) {
				// Handle authentication expiration
				if (response.status === 401) {
					const data = await response.json().catch(() => ({}));
					const message =
						data.error || "Your session has expired. Please sign in again.";
					throw new Error(message);
				}
				// Handle rate limit specifically
				if (response.status === 429) {
					const data = await response.json().catch(() => ({}));
					const retryAfter = data.retry_after || 60;
					throw new Error(
						`Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
					);
				}
				throw new Error("Failed to save checklist state");
			}

			// Notify parent component
			onItemToggle?.(itemId, newCompletedState);
		} catch (err) {
			console.error("Error toggling checklist item:", err);
			// Revert optimistic update on error
			setChecklistItems((prev) =>
				prev.map((item) =>
					item.id === itemId
						? { ...item, is_completed: currentlyCompleted }
						: item,
				),
			);

			// Show toast notification with retry option
			const errorMessage =
				err instanceof Error ? err.message : "Failed to save checklist state";
			toast({
				title: "Failed to save",
				description: errorMessage,
				variant: "destructive",
				action: {
					label: "Retry",
					onClick: () => toggleItem(itemId, currentlyCompleted),
				},
			});
		}
	};

	const completedCount = checklistItems.filter(
		(item) => item.is_completed,
	).length;
	const totalCount = checklistItems.length;
	const progressPercentage =
		totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{categoryIcon && <span>{categoryIcon}</span>}
						{category} Checklist
					</DialogTitle>
					<DialogDescription>
						Practice these coaching tips to improve your{" "}
						{category.toLowerCase()}
					</DialogDescription>
				</DialogHeader>

				{/* Progress indicator */}
				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Progress</span>
						<span className="font-semibold">
							{completedCount} / {totalCount} completed
						</span>
					</div>
					<div className="w-full bg-muted rounded-full h-2">
						<div
							className="bg-primary rounded-full h-2 transition-all duration-300"
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>
				</div>

				{/* Checklist items */}
				<ScrollArea className="max-h-[400px] pr-4">
					{loading ? (
						<div className="space-y-3">
							{[1, 2, 3, 4].map((i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : error ? (
						<div className="text-center py-8 text-destructive">{error}</div>
					) : checklistItems.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							No checklist items available for this category
						</div>
					) : (
						<div className="space-y-2">
							{checklistItems.map((item) => (
								<button
									key={item.id}
									type="button"
									onClick={() => toggleItem(item.id, item.is_completed)}
									className={cn(
										"w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
										item.is_completed
											? "border-green-200 bg-green-50 dark:bg-green-900/10"
											: "border-border bg-background hover:bg-muted",
									)}
								>
									<div className="flex-shrink-0 pt-0.5">
										{item.is_completed ? (
											<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
										) : (
											<Circle className="h-5 w-5 text-muted-foreground" />
										)}
									</div>
									<div className="flex-1">
										<p
											className={cn(
												"text-sm",
												item.is_completed
													? "line-through text-muted-foreground"
													: "text-foreground",
											)}
										>
											{item.item_text}
										</p>
									</div>
								</button>
							))}
						</div>
					)}
				</ScrollArea>

				{/* Footer with coaching note */}
				<div className="text-xs text-muted-foreground text-center pt-2 border-t">
					💡 Tip: Check off items as you practice them in future responses
				</div>
			</DialogContent>
		</Dialog>
	);
}
