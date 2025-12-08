import type { NextRequest } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";

/**
 * GET /api/checklist/export?evaluationId=<eval_id>
 * Export completed checklist items for a Playbook
 * Returns formatted text suitable for including in a Playbook export
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
		const evaluationId = searchParams.get("evaluationId");

		if (!evaluationId) {
			return createErrorResponse(
				"Evaluation ID is required",
				"MISSING_EVALUATION_ID",
				400,
			);
		}

		// Fetch completed checklist items for this evaluation
		const { data: completions, error: completionsError } = await supabase
			.from("checklist_completions")
			.select(
				`
				*,
				template:checklist_templates(
					category,
					item_text,
					display_order
				)
			`,
			)
			.eq("user_id", user.id)
			.eq("evaluation_id", evaluationId)
			.order("completed_at", { ascending: true });

		if (completionsError) {
			throw new Error(
				`Failed to fetch completions: ${completionsError.message}`,
			);
		}

		// Fetch evaluation delivery note
		const { data: evaluation, error: evalError } = await supabase
			.from("evaluation_results")
			.select("delivery_note, score, created_at")
			.eq("id", evaluationId)
			.single();

		if (evalError && evalError.code !== "PGRST116") {
			// PGRST116 is "not found", which is ok
			throw new Error(`Failed to fetch evaluation: ${evalError.message}`);
		}

		// Group completions by category
		const completionsByCategory: Record<
			string,
			Array<{ item_text: string; display_order: number }>
		> = {};

		completions?.forEach((completion) => {
			const template = completion.template as {
				category: string;
				item_text: string;
				display_order: number;
			};
			if (!completionsByCategory[template.category]) {
				completionsByCategory[template.category] = [];
			}
			completionsByCategory[template.category].push({
				item_text: template.item_text,
				display_order: template.display_order,
			});
		});

		// Sort items within each category
		Object.keys(completionsByCategory).forEach((category) => {
			completionsByCategory[category].sort(
				(a, b) => a.display_order - b.display_order,
			);
		});

		// Generate formatted export text
		let exportText = "## Coaching Checklist - Completed Items\n\n";

		if (evaluation?.score !== undefined) {
			exportText += `**Score:** ${evaluation.score}%\n`;
			exportText += `**Date:** ${new Date(evaluation.created_at).toLocaleDateString()}\n\n`;
		}

		if (evaluation?.delivery_note) {
			exportText += `**Delivery Note:** ${evaluation.delivery_note}\n\n`;
		}

		const categoryCount = Object.keys(completionsByCategory).length;
		if (categoryCount === 0) {
			exportText += "*No checklist items completed yet.*\n";
		} else {
			exportText += `You've completed ${completions?.length || 0} coaching items across ${categoryCount} categories:\n\n`;

			Object.entries(completionsByCategory)
				.sort(([a], [b]) => a.localeCompare(b))
				.forEach(([category, items]) => {
					exportText += `### ${category}\n`;
					items.forEach((item) => {
						exportText += `- ✅ ${item.item_text}\n`;
					});
					exportText += "\n";
				});
		}

		return createSuccessResponse({
			evaluationId,
			completions: completionsByCategory,
			deliveryNote: evaluation?.delivery_note || null,
			formattedText: exportText,
			totalCompleted: completions?.length || 0,
			categoriesCount: categoryCount,
		});
	} catch (error) {
		console.error("Error in checklist export:", error);
		return createErrorResponse(
			"Failed to export checklist",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
