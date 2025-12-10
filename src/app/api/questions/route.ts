import type { NextRequest } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";

/**
 * GET /api/questions?specialty={specialty}&limit={limit}
 *
 * Fetches questions filtered by specialty with proper ratio (70-80% match).
 *
 * Query Parameters:
 * - specialty: The target specialty (e.g., "pediatrics", "cardiology")
 * - limit: Maximum number of questions to return (default: 10)
 *
 * Returns:
 * - questions: Array of questions matching the specialty filter
 * - matchRatio: Percentage of questions matching the specialty
 * - totalCount: Total number of questions returned
 */
export async function GET(request: NextRequest) {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return createUnauthorizedResponse("Authentication required");
	}

	try {
		const { searchParams } = new URL(request.url);
		const specialty = searchParams.get("specialty");
		const limitParam = searchParams.get("limit");
		const limit = limitParam ? parseInt(limitParam, 10) : 10;

		if (!specialty) {
			return createErrorResponse(
				"Specialty parameter is required",
				"MISSING_SPECIALTY",
				400,
			);
		}

		if (Number.isNaN(limit) || limit < 1 || limit > 100) {
			return createErrorResponse(
				"Limit must be between 1 and 100",
				"INVALID_LIMIT",
				400,
			);
		}

		// Use the PostgreSQL function for optimized specialty filtering
		const { data: questions, error } = await supabase.rpc(
			"get_questions_by_specialty",
			{
				target_specialty: specialty,
				limit_count: limit,
			},
		);

		if (error) {
			console.error("Error fetching questions by specialty:", error);
			throw new Error(`Failed to fetch questions: ${error.message}`);
		}

		if (!questions || questions.length === 0) {
			return createSuccessResponse({
				questions: [],
				matchRatio: 0,
				totalCount: 0,
				message: `No questions found for specialty: ${specialty}`,
			});
		}

		// Calculate match ratio
		const matchingCount = questions.filter(
			(q: { question_specialty: string }) => q.question_specialty === specialty,
		).length;
		const matchRatio = Math.round((matchingCount / questions.length) * 100);

		// Transform the results to a more user-friendly format
		const formattedQuestions = questions.map(
			(q: {
				question_id: string;
				question_text: string;
				question_type: string;
				question_specialty: string;
				evaluation_id: string;
				evaluation_title: string;
			}) => ({
				id: q.question_id,
				text: q.question_text,
				type: q.question_type,
				specialty: q.question_specialty,
				evaluation: {
					id: q.evaluation_id,
					title: q.evaluation_title,
				},
			}),
		);

		return createSuccessResponse({
			questions: formattedQuestions,
			matchRatio,
			totalCount: questions.length,
			specialty,
			message: `Found ${questions.length} questions (${matchRatio}% specialty match)`,
		});
	} catch (error) {
		console.error("Error in questions API:", error);
		return createErrorResponse(
			"Failed to fetch questions",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
