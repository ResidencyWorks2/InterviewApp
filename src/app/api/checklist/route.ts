import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { PostHogAnalyticsService } from "@/features/notifications/infrastructure/posthog/AnalyticsService";
import {
	createPostHogConfig,
	toAnalyticsServiceConfig,
} from "@/infrastructure/posthog/client";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";
import { findClosestCategory } from "@/shared/utils/category-matcher";

/**
 * GET /api/checklist?category=<category>&evaluationId=<eval_id>
 *
 * Fetches checklist items for a category with completion status for the user.
 * Uses category matching algorithm (exact, prefix, Levenshtein) to find closest matching template category.
 * Tracks analytics event `checklist_opened` when items are successfully loaded.
 *
 * @param request - Next.js request object
 * @param request.searchParams.category - Category name from evaluation (e.g., "Communication", "Problem Solving")
 * @param request.searchParams.evaluationId - UUID of the evaluation result
 * @returns Success response with checklist items array, or error response
 * @throws {Error} If authentication fails, category/evaluationId missing, or database error
 *
 * @example
 * GET /api/checklist?category=Communication&evaluationId=123e4567-e89b-12d3-a456-426614174000
 */
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			// Check if error indicates session expiration
			const isExpired =
				authError?.message?.includes("expired") ||
				authError?.message?.includes("invalid") ||
				authError?.status === 401;
			const message = isExpired
				? "Your session has expired. Please sign in again."
				: "Authentication required";
			return createUnauthorizedResponse(message);
		}

		const { searchParams } = new URL(request.url);
		const category = searchParams.get("category");
		const evaluationId = searchParams.get("evaluationId");

		console.log("🔍 Checklist API called with:", { category, evaluationId });

		if (!category) {
			return createErrorResponse(
				"Category is required",
				"MISSING_CATEGORY",
				400,
			);
		}

		if (!evaluationId) {
			return createErrorResponse(
				"Evaluation ID is required",
				"MISSING_EVALUATION_ID",
				400,
			);
		}

		// Fetch all distinct template categories for matching
		const { data: allTemplates, error: allTemplatesError } = await supabase
			.from("checklist_templates")
			.select("category")
			.eq("is_active", true);

		if (allTemplatesError) {
			throw new Error(
				`Failed to fetch template categories: ${allTemplatesError.message}`,
			);
		}

		// Get unique categories
		const templateCategories = Array.from(
			new Set(allTemplates?.map((t) => t.category) || []),
		);

		// Find closest matching category using FR-016 algorithm
		const matchResult = findClosestCategory(category, templateCategories);
		const matchedCategory = matchResult.matchedCategory || category;

		// Log category mismatch to Sentry if non-exact match was used
		if (matchResult.strategy !== "exact") {
			const mismatchData = {
				event_type: "checklist_category_mismatch",
				evaluation_category: category,
				matched_template_category: matchedCategory,
				matching_strategy: matchResult.strategy,
				levenshtein_distance:
					matchResult.strategy === "levenshtein" ? matchResult.distance : null,
				user_id: user.id, // Will be scrubbed by Sentry
				evaluation_id: evaluationId,
				timestamp: new Date().toISOString(),
			};

			Sentry.captureMessage("Checklist category mismatch detected", {
				level: "warning",
				tags: {
					event_type: "checklist_category_mismatch",
					matching_strategy: matchResult.strategy,
				},
				extra: mismatchData,
			});
		}

		// Fetch checklist templates for the matched category
		const { data: templates, error: templatesError } = await supabase
			.from("checklist_templates")
			.select("*")
			.eq("category", matchedCategory)
			.eq("is_active", true)
			.order("display_order", { ascending: true });

		console.log("📋 Templates fetched:", {
			count: templates?.length || 0,
			category,
			templates,
		});

		if (templatesError) {
			throw new Error(
				`Failed to fetch checklist templates: ${templatesError.message}`,
			);
		}

		// Fetch user's completions for this evaluation
		const { data: completions, error: completionsError } = await supabase
			.from("checklist_completions")
			.select("template_id")
			.eq("user_id", user.id)
			.eq("evaluation_id", evaluationId);

		if (completionsError) {
			throw new Error(
				`Failed to fetch completions: ${completionsError.message}`,
			);
		}

		// Create a set of completed template IDs for quick lookup
		const completedIds = new Set(completions?.map((c) => c.template_id) || []);

		// Merge templates with completion status
		const items = templates?.map((template) => ({
			id: template.id,
			category: template.category,
			item_text: template.item_text,
			display_order: template.display_order,
			is_completed: completedIds.has(template.id),
		}));

		// Track checklist_opened analytics event when items are successfully loaded
		try {
			const postHogConfig = createPostHogConfig();
			const analyticsConfig = toAnalyticsServiceConfig(postHogConfig);
			const analyticsService = new PostHogAnalyticsService(analyticsConfig);
			await analyticsService.track(
				"checklist_opened",
				{
					category,
					evaluation_id: evaluationId,
					item_count: items?.length || 0,
					completed_count: completedIds.size,
				},
				user.id,
			);
		} catch (analyticsError) {
			// Don't fail the request if analytics fails
			console.error("Failed to track checklist_opened event:", analyticsError);
		}

		return createSuccessResponse({
			items: items || [],
			category,
			evaluationId,
		});
	} catch (error) {
		console.error("Error in checklist GET:", error);
		return createErrorResponse(
			"Failed to fetch checklist",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
