import type { NextRequest } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";

/**
 * GET /api/checklist?category=<category>&evaluationId=<eval_id>
 * Fetch checklist items for a category with completion status for the user
 */
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return createUnauthorizedResponse("Authentication required");
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

		// Fetch checklist templates for the category
		const { data: templates, error: templatesError } = await supabase
			.from("checklist_templates")
			.select("*")
			.eq("category", category)
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
