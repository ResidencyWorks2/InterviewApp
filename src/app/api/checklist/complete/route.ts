import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";

const CompleteChecklistSchema = z.object({
	evaluation_id: z.string().uuid(),
	template_id: z.string().uuid(),
	completed: z.boolean(),
});

/**
 * POST /api/checklist/complete
 * Toggle completion status of a checklist item for a user's evaluation
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return createUnauthorizedResponse("Authentication required");
		}

		const json = await request.json();
		const parsed = CompleteChecklistSchema.safeParse(json);

		if (!parsed.success) {
			return createErrorResponse(
				"Invalid request payload",
				"VALIDATION_ERROR",
				422,
			);
		}

		const { evaluation_id, template_id, completed } = parsed.data;

		if (completed) {
			// Add completion record
			const { data, error } = await supabase
				.from("checklist_completions")
				.upsert(
					{
						user_id: user.id,
						evaluation_id,
						template_id,
					},
					{
						onConflict: "user_id,evaluation_id,template_id",
					},
				)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to save completion: ${error.message}`);
			}

			return createSuccessResponse({
				completed: true,
				completion: data,
			});
		} else {
			// Remove completion record
			const { error } = await supabase
				.from("checklist_completions")
				.delete()
				.eq("user_id", user.id)
				.eq("evaluation_id", evaluation_id)
				.eq("template_id", template_id);

			if (error) {
				throw new Error(`Failed to remove completion: ${error.message}`);
			}

			return createSuccessResponse({
				completed: false,
			});
		}
	} catch (error) {
		console.error("Error in checklist complete:", error);
		return createErrorResponse(
			"Failed to update checklist",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
