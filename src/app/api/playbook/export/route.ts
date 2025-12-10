import type { NextRequest } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";
import type { Tables } from "@/types/database";

type EvaluationResult = Tables<"evaluation_results">;

/**
 * GET /api/playbook/export?evaluationId=<eval_id>
 *
 * Exports a complete Playbook document for an evaluation, including:
 * - Evaluation results (score, feedback, categories, delivery note)
 * - Completed checklist items (organized by category)
 *
 * The Playbook combines evaluation data with checklist export data to provide
 * a comprehensive practice document for the user.
 *
 * @param request - Next.js request object
 * @param request.searchParams.evaluationId - UUID of the evaluation result
 * @returns Success response with formatted Playbook markdown document
 * @throws {Error} If authentication fails, evaluationId missing, or database error
 *
 * @example
 * GET /api/playbook/export?evaluationId=123e4567-e89b-12d3-a456-426614174000
 *
 * Response includes:
 * - formattedText: Complete Playbook markdown document
 * - evaluationId: The evaluation ID
 * - includesChecklist: Whether checklist items were included
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

		// Fetch evaluation data
		const { data: evaluation, error: evalError } = await supabase
			.from("evaluation_results")
			.select("*")
			.eq("id", evaluationId)
			.single();

		if (evalError) {
			if (evalError.code === "PGRST116") {
				return createErrorResponse(
					"Evaluation not found",
					"EVALUATION_NOT_FOUND",
					404,
				);
			}
			throw new Error(`Failed to fetch evaluation: ${evalError.message}`);
		}

		if (!evaluation) {
			return createErrorResponse(
				"Evaluation not found",
				"EVALUATION_NOT_FOUND",
				404,
			);
		}

		// Type assertion for evaluation data
		const evalData = evaluation as EvaluationResult;

		// Verify user owns this evaluation
		if (evalData.user_id && evalData.user_id !== user.id) {
			return createErrorResponse(
				"Forbidden: You do not have access to this evaluation",
				"FORBIDDEN",
				403,
			);
		}

		// Fetch checklist export data by calling the checklist export endpoint logic
		// We'll fetch checklist data directly to avoid HTTP overhead
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
			// Log error but don't fail the export - checklist is optional
			console.warn(
				"Failed to fetch checklist completions:",
				completionsError.message,
			);
		}

		// Group checklist completions by category
		const completionsByCategory: Record<
			string,
			Array<{ item_text: string; display_order: number }>
		> = {};

		completions?.forEach((completion) => {
			const template = completion.template as {
				category: string;
				item_text: string;
				display_order: number;
			} | null;

			if (template) {
				if (!completionsByCategory[template.category]) {
					completionsByCategory[template.category] = [];
				}
				completionsByCategory[template.category].push({
					item_text: template.item_text,
					display_order: template.display_order,
				});
			}
		});

		// Sort items within each category
		Object.keys(completionsByCategory).forEach((category) => {
			completionsByCategory[category].sort(
				(a, b) => a.display_order - b.display_order,
			);
		});

		// Build Playbook document
		let playbookText = "# Practice Playbook\n\n";
		playbookText += `**Evaluation Date:** ${new Date(evalData.created_at).toLocaleDateString()}\n\n`;

		// Evaluation Results Section
		playbookText += "## Evaluation Results\n\n";
		playbookText += `**Overall Score:** ${evalData.score}%\n\n`;

		if (evalData.feedback) {
			playbookText += `### Feedback\n\n${evalData.feedback}\n\n`;
		}

		if (evalData.what_changed) {
			playbookText += `### What to Practice\n\n${evalData.what_changed}\n\n`;
		}

		if (evalData.practice_rule) {
			playbookText += `### Practice Rule\n\n${evalData.practice_rule}\n\n`;
		}

		if (evalData.delivery_note) {
			playbookText += `### Delivery Note\n\n${evalData.delivery_note}\n\n`;
		}

		// Checklist Section
		const categoryCount = Object.keys(completionsByCategory).length;
		const totalCompleted = completions?.length || 0;

		if (categoryCount > 0 && totalCompleted > 0) {
			playbookText += "## Coaching Checklist - Completed Items\n\n";
			playbookText += `You've completed ${totalCompleted} coaching items across ${categoryCount} categories:\n\n`;

			Object.entries(completionsByCategory)
				.sort(([a], [b]) => a.localeCompare(b))
				.forEach(([category, items]) => {
					playbookText += `### ${category}\n`;
					items.forEach((item) => {
						playbookText += `- ✅ ${item.item_text}\n`;
					});
					playbookText += "\n";
				});
		} else {
			// Include checklist section even if empty, but with a message
			playbookText += "## Coaching Checklist\n\n";
			playbookText += "*No checklist items completed yet.*\n\n";
		}

		return createSuccessResponse({
			evaluationId,
			formattedText: playbookText,
			includesChecklist: categoryCount > 0,
			totalCompleted,
			categoriesCount: categoryCount,
		});
	} catch (error) {
		console.error("Error in Playbook export:", error);
		return createErrorResponse(
			"Failed to export Playbook",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
